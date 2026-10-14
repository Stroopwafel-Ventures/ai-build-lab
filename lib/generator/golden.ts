/**
 * Stage 7: golden scenarios.
 *
 * Eight planted matches that a good matcher should find. Each one has:
 *   - a NEED (an open job, or a need written into a meeting note)
 *   - the BEST-FIT contact, reachable through a strong (4–5) warm path
 *   - a DECOY contact that looks relevant on keywords but is a worse fit
 *     and only reachable weakly (strength 1–2) or via employment overlap
 *
 * The best and decoy contacts are hand-written here (not random), and are
 * excluded from the random relationship generator, so the paths below are
 * the only ones that exist. seed/GOLDEN_SCENARIOS.md documents them.
 */
import type { CompanyFixture, ContactFixture, ContactType, EmploymentFixture, JobFixture, UserContactFixture } from "../fixtures";
import { countryOf } from "./companies";
import { monthOf, monthToIso, daysAgo } from "./dates";
import { emailLocal, slugify, stableId } from "./ids";
import { makeJob } from "./jobs";
import type { Rng } from "./rng";
import type { CompanyMeta, ContactMeta, Fn, GoldenScenario } from "./types";

interface GoldenPerson {
  slug: string;
  first: string;
  last: string;
  type: ContactType;
  fn: Fn;
  level: number;
  city: string;
  tags: string[];
  headline: string;
  summary: string;
  email: "work" | "personal" | null;
  /** [company name, title, "YYYY-MM", "YYYY-MM" | null, description] oldest first; last = current */
  history: [string, string, string, string | null, string | null][];
}

export interface NoteNeed {
  meetingType: "portfolio_checkin" | "founder_catchup";
  sectionHeading: string;
  bullets: { text: string; subs: string[] }[];
  ask: string;
  nextStep: string;
}

interface GoldenSpec {
  key: string;
  title: string;
  company: string;
  needKind: "note" | "job";
  needSummary: string;
  job?: [string, JobFixture["department"], JobFixture["seniority"], string, number]; // title, dept, seniority, location, days ago
  note: NoteNeed;
  best: GoldenPerson;
  bestWhy: string;
  warm: { userKey: string; strength: number };
  decoy: GoldenPerson;
  decoyWhy: string;
  decoyPath: { userKey: string; strength: number } | { overlapVia: "best"; company: string };
  queryHint: string;
}

export const GOLDEN_SPECS: GoldenSpec[] = [
  {
    key: "G1",
    title: "Kademint wants a bank distribution partner",
    company: "Kademint",
    needKind: "note",
    needSummary: "Explicit ask: an intro to someone at Noordhaven Bank who owns SME banking partnerships, to distribute Kademint's cash-management product to the bank's SME clients.",
    note: {
      meetingType: "portfolio_checkin",
      sectionHeading: "Bank distribution",
      bullets: [
        { text: "Distribution through a bank is now the single biggest lever on CAC", subs: ["Direct sales CAC is ~€4.1k per SME; a bank channel pilot elsewhere came in under €900", "SME clients trust their house bank for anything touching cash, which shortens the sales cycle a lot"] },
        { text: "Noordhaven Bank is the obvious first partner", subs: ["Roughly 180k SME clients in the Benelux and no modern cash-forecasting tool in their online banking", "The team has only spoken to the retail app people so far, who were friendly but do not own SME propositions"] },
      ],
      ask: "Explicit ask: can we intro Kademint to someone at Noordhaven Bank who owns SME banking partnerships (not the retail app team)?",
      nextStep: "find the right owner of SME partnerships at Noordhaven Bank and make a warm intro",
    },
    best: {
      slug: "golden:g1:best", first: "Marloes", last: "Achterberg", type: "corporate", fn: "partnerships", level: 4, city: "Amsterdam",
      tags: ["SME banking", "partnerships", "embedded finance", "distribution", "banking"],
      headline: "Head of SME Banking Partnerships at Noordhaven Bank",
      summary: "I run SME banking partnerships at Noordhaven Bank: the fintechs and software providers we bring to our 180,000 SME clients. Before the bank I built Ravelpay's partner programme and started out in strategy consulting.",
      email: "work",
      history: [
        ["Ashgrove Strategy Partners", "Senior Consultant", "2012-09", "2016-08", "Financial-services practice; SME banking strategy projects."],
        ["Ravelpay", "Partnerships Lead", "2016-09", "2021-03", "Built the partner programme for banks and ISVs."],
        ["Noordhaven Bank", "Head of SME Banking Partnerships", "2021-04", null, "Owns third-party propositions and distribution partnerships for SME clients."],
      ],
    },
    bestWhy: "Owns SME banking partnerships at the exact bank Kademint named, previously built a payments partner programme, and is known very well by a partnerships participant.",
    warm: { userKey: "p08", strength: 5 },
    decoy: {
      slug: "golden:g1:decoy", first: "Bas", last: "Hoogendoorn", type: "corporate", fn: "product", level: 2, city: "Amsterdam",
      tags: ["mobile banking", "retail banking", "product ownership", "banking"],
      headline: "Product Owner, Retail Mobile App at Noordhaven Bank",
      summary: "Product owner for the Noordhaven Bank retail mobile app. Previously a product manager at a consumer fintech.",
      email: null,
      history: [
        ["Fluxdam", "Product Manager", "2017-02", "2021-06", null],
        ["Noordhaven Bank", "Product Owner, Retail Mobile App", "2021-07", null, "Owns the savings and payments journeys in the retail app."],
      ],
    },
    decoyWhy: "Right bank, wrong function: he owns the consumer app, which is exactly the team Kademint already spoke to. Only a weak tie.",
    decoyPath: { userKey: "p02", strength: 1 },
    queryHint: "contacts c join companies co on co.id = c.current_company_id where co.name ilike '%Noordhaven%' and (c.current_title ilike '%SME%' or c.current_title ilike '%partnership%') → join user_contacts uc on uc.contact_id = c.id order by uc.strength desc",
  },
  {
    key: "G2",
    title: "Reclaimr keeps stalling in retail procurement",
    company: "Reclaimr",
    needKind: "note",
    needSummary: "Implied need: Reclaimr's retail pilots succeed operationally but stall at central procurement. Nobody asked for an intro, but an ex-retail procurement leader would unblock them.",
    note: {
      meetingType: "portfolio_checkin",
      sectionHeading: "Retail pilots and procurement",
      bullets: [
        { text: "Both large-retailer pilots hit their operational targets but neither has converted", subs: ["Return rates of reusable crates above 94% in both pilots; store staff happy", "Each deal went quiet once it moved from the sustainability team to central procurement"] },
        { text: "We keep losing momentum at the procurement stage with large retailers", subs: ["Vendor onboarding questionnaires of 140+ questions; packaging sits in a category nobody on our side has ever spoken to", "The founders suspect they are pitching the wrong people and the wrong business case (cost per trip vs. sustainability)"] },
      ],
      ask: "Not an explicit ask, but the team clearly lacks someone who knows how retail procurement and category management actually decide. Worth thinking about who could coach them.",
      nextStep: "think about who in the network understands retail procurement from the inside",
    },
    best: {
      slug: "golden:g2:best", first: "Annemiek", last: "Stolwijk", type: "expert", fn: "procurement", level: 6, city: "Haarlem",
      tags: ["retail procurement", "category management", "supplier onboarding", "packaging", "circular economy", "fractional"],
      headline: "Independent advisor on retail procurement | ex-Head of Procurement, Non-Food at Huisgoed Retail Group",
      summary: "I spent eight years running non-food procurement at Huisgoed Retail Group, including packaging and store supplies. Today I help suppliers and startups sell into large retailers: business cases, vendor onboarding and category reviews.",
      email: "personal",
      history: [
        ["Havenlink Logistics", "Senior Buyer", "2010-03", "2015-08", "Packaging and indirect procurement."],
        ["Huisgoed Retail Group", "Head of Procurement, Non-Food", "2015-09", "2023-03", "Ran a €300m non-food category including packaging, store supplies and returns logistics."],
        ["Self-employed", "Independent Retail Procurement Advisor", "2023-04", null, "Fractional advisor to suppliers selling into large retailers."],
      ],
    },
    bestWhy: "Ran non-food procurement (including packaging and returns) at the retailer type Reclaimr sells to, and now advises startups on exactly this. Known well by a partnerships participant.",
    warm: { userKey: "p14", strength: 4 },
    decoy: {
      slug: "golden:g2:decoy", first: "Ruud", last: "Kalkman", type: "corporate", fn: "marketing", level: 3, city: "Zaandam",
      tags: ["category management", "retail", "household products"],
      headline: "Category Manager, Household at Huisgoed Retail Group",
      summary: "Category manager for household products at Huisgoed Retail Group.",
      email: null,
      history: [
        ["Peppermill Foods", "Trade Marketing Manager", "2014-01", "2019-04", null],
        ["Huisgoed Retail Group", "Category Manager, Household", "2019-05", null, "Range and promotions for household products."],
      ],
    },
    decoyWhy: "A current insider at the retailer with 'category manager' in the title, but he owns household ranges, not packaging or procurement, and nobody on the team knows him: reachable only through a former colleague.",
    decoyPath: { overlapVia: "best", company: "Huisgoed Retail Group" },
    queryHint: "search meeting_notes.body for 'procurement' + 'retailer' → contact_employment ce join companies co on co.id = ce.company_id where co.industry = 'Retail' and ce.title ilike '%procurement%' (include past roles) → rank by max(user_contacts.strength)",
  },
  {
    key: "G3",
    title: "Stackharbor needs a VP Engineering",
    company: "Stackharbor",
    needKind: "job",
    needSummary: "Open job: VP Engineering at Stackharbor (Series A developer-tools company, Amsterdam).",
    job: ["VP Engineering", "exec", "vp", "Amsterdam", 38],
    note: {
      meetingType: "portfolio_checkin",
      sectionHeading: "VP Engineering search",
      bullets: [
        { text: "VP Engineering is the critical hire for the next 12 months", subs: ["The CTO is still managing 14 engineers directly and it is slowing down architecture work", "Ideal profile: has scaled a developer-tools or infrastructure team from ~15 to 50+, and knows what developers expect from a product"] },
      ],
      ask: "Explicit ask: referrals for the VP Engineering role, ideally people who have scaled engineering at a developer-tools or cloud company.",
      nextStep: "send the strongest VP Engineering profiles from the network",
    },
    best: {
      slug: "golden:g3:best", first: "Sebastiaan", last: "Korving", type: "candidate", fn: "engineering", level: 4, city: "Amsterdam",
      tags: ["developer tools", "platform engineering", "engineering leadership", "Kubernetes", "scaling teams", "CI/CD"],
      headline: "Director of Engineering at Quillstack | Developer tools · Platform engineering",
      summary: "I lead engineering at Quillstack, a hosted CI/CD platform, where I grew the team from 12 to 55. Before that I ran the container platform team at Cloudmere. Looking for a VP-level role at a developer-tools company in Amsterdam.",
      email: "personal",
      history: [
        ["Basalt Cloud", "Senior Software Engineer", "2012-06", "2016-01", "Managed Kubernetes control plane."],
        ["Cloudmere", "Engineering Manager, Container Platform", "2016-02", "2020-12", "Led the container platform team (18 engineers)."],
        ["Quillstack", "Director of Engineering", "2021-01", null, "Scaled engineering from 12 to 55; owns platform and developer experience."],
      ],
    },
    bestWhy: "Has scaled engineering at a developer-tools company from 12 to 55, deep platform background, wants a VP role in Amsterdam, and a talent participant knows him very well.",
    warm: { userKey: "p04", strength: 5 },
    decoy: {
      slug: "golden:g3:decoy", first: "Gerrit", last: "Wolters", type: "candidate", fn: "engineering", level: 5, city: "Zaandam",
      tags: ["engineering leadership", "e-commerce", "IT management", "vendor management"],
      headline: "VP Engineering at Huisgoed Retail Group",
      summary: "VP Engineering for the e-commerce and store systems of Huisgoed Retail Group, managing a 400-person organisation that is largely outsourced.",
      email: "work",
      history: [
        ["Zuidas Advisory Group", "IT Manager", "2008-01", "2015-12", null],
        ["Huisgoed Retail Group", "VP Engineering", "2016-01", null, "E-commerce, store systems and vendor management."],
      ],
    },
    decoyWhy: "Exact title match ('VP Engineering'), but in a 400-person, largely outsourced retail IT organisation with no developer-tools experience; only a weak tie.",
    decoyPath: { userKey: "p11", strength: 2 },
    queryHint: "jobs j where j.title = 'VP Engineering' → contacts whose expertise_tags && '{developer tools,platform engineering}' and seniority ≥ director (current_title ilike '%Director of Engineering%' or '%VP Engineering%') → join user_contacts, prefer strength ≥ 4",
  },
  {
    key: "G4",
    title: "Corvia Health is raising a Series C",
    company: "Corvia Health",
    needKind: "note",
    needSummary: "Explicit ask: intros to growth investors with health-tech depth for a ~€35m Series C, ideally someone who understands reimbursement-driven revenue.",
    note: {
      meetingType: "founder_catchup",
      sectionHeading: "Series C plans",
      bullets: [
        { text: "Planning to raise a ~€35m Series C, kicking off in Q1 2027", subs: ["Runway is fine (about 20 months), but two insurer contracts would accelerate if they can show a stronger balance sheet", "Want a lead who already understands reimbursement-driven revenue and won't discount it as 'services'"] },
        { text: "Generalist growth funds keep getting stuck on the reimbursement model", subs: ["Two first meetings this summer ended with 'come back when it's pure SaaS'"] },
      ],
      ask: "Explicit ask: warm intros to growth-stage investors with real health-tech/medtech depth who could lead a €35m Series C.",
      nextStep: "shortlist growth investors with health-tech depth and make intros before the Q1 kickoff",
    },
    best: {
      slug: "golden:g4:best", first: "Olivia", last: "Brandsma", type: "investor", fn: "investing", level: 4, city: "London",
      tags: ["health tech", "medtech", "growth equity", "reimbursement", "Series C"],
      headline: "Partner at Copperbeech Growth | Health tech & medtech",
      summary: "Partner at Copperbeech Growth, where I lead our health-tech and medtech investments from Series B onwards. Before investing I worked on reimbursement strategy at a health insurer.",
      email: "work",
      history: [
        ["Dijkwacht Insurance", "Strategy Manager, Reimbursement", "2011-09", "2016-05", "Reimbursement strategy for digital care."],
        ["Oakmeadow Partners", "Principal", "2016-06", "2020-12", "Health tech and fintech growth deals."],
        ["Copperbeech Growth", "Partner", "2021-01", null, "Leads health-tech and medtech growth investments."],
      ],
    },
    bestWhy: "A partner at a growth fund specialising in health tech, with a reimbursement background (ex-insurer), able to lead a €35m round. A general partner knows her very well.",
    warm: { userKey: "i01", strength: 5 },
    decoy: {
      slug: "golden:g4:decoy", first: "Mats", last: "Engström", type: "investor", fn: "investing", level: 1, city: "Copenhagen",
      tags: ["health tech", "seed investing", "Series A"],
      headline: "Associate at Fjordline Ventures",
      summary: "Associate at Fjordline Ventures covering health and climate at seed and Series A.",
      email: "work",
      history: [
        ["Kalmhuis Health", "Business Analyst", "2019-09", "2023-02", null],
        ["Fjordline Ventures", "Associate", "2023-03", null, "Sourcing seed and Series A deals in health and climate."],
      ],
    },
    decoyWhy: "Has 'health tech' in his tags, but he is an associate at a seed/Series A fund that cannot lead a €35m round; weak tie.",
    decoyPath: { userKey: "i05", strength: 2 },
    queryHint: "contacts where contact_type = 'investor' and expertise_tags && '{health tech,medtech}' join companies co on co.id = c.current_company_id (check co.description for growth / Series B+) and current_title in Partner/GP → max user_contacts.strength",
  },
  {
    key: "G5",
    title: "Signalbay wants to partner with Assistora",
    company: "Signalbay",
    needKind: "note",
    needSummary: "Semi-explicit ask: Signalbay wants a marketplace listing and co-sell with Assistora (60% of their customers use it) and asks who runs Assistora's partner ecosystem.",
    note: {
      meetingType: "portfolio_checkin",
      sectionHeading: "Assistora integration",
      bullets: [
        { text: "About 60% of Signalbay customers run their support desk on Assistora", subs: ["The integration is the most-used feature; tickets are the richest feedback source", "A listing in Assistora's app marketplace plus co-selling could double inbound"] },
        { text: "No relationship with Assistora's partner team yet", subs: ["Applied through the public partner portal in June, no response", "They heard the partnerships team was reshuffled in 2023 and are not sure who owns the ecosystem now"] },
      ],
      ask: "Who do we know who runs Assistora's partner ecosystem or app marketplace today? An intro would be the single most useful thing for Signalbay this quarter.",
      nextStep: "find the current owner of Assistora's partner ecosystem and broker an intro",
    },
    best: {
      slug: "golden:g5:best", first: "Caoimhe", last: "Ferriter", type: "corporate", fn: "partnerships", level: 5, city: "Dublin",
      tags: ["partnerships", "ecosystem", "app marketplace", "co-selling", "customer support software"],
      headline: "VP Partnerships & Ecosystem at Assistora",
      summary: "I run partnerships and the app marketplace at Assistora: technology partners, co-selling and our 1,200-app ecosystem. Previously I built the partner programme at Orbitdesk.",
      email: "work",
      history: [
        ["Orbitdesk", "Head of Partnerships", "2015-04", "2022-01", "Built the ISV partner programme and marketplace."],
        ["Assistora", "VP Partnerships & Ecosystem", "2022-02", null, "Owns technology partnerships, co-sell and the app marketplace."],
      ],
    },
    bestWhy: "Currently owns Assistora's partner ecosystem and app marketplace (exactly the need), and a partnerships participant knows her well.",
    warm: { userKey: "p16", strength: 4 },
    decoy: {
      slug: "golden:g5:decoy", first: "Dries", last: "Vanhoutte", type: "operator", fn: "partnerships", level: 3, city: "Antwerp",
      tags: ["partnerships", "channel sales", "customer support software"],
      headline: "Partnerships Lead at Junoflow | ex-Assistora",
      summary: "Partnerships at Junoflow. Before that I spent four years in Assistora's partner team.",
      email: "personal",
      history: [
        ["Assistora", "Senior Partner Manager", "2019-03", "2023-05", "Managed technology partners in the app marketplace."],
        ["Junoflow", "Partnerships Lead", "2023-06", null, "Runs integrations and channel partnerships."],
      ],
    },
    decoyWhy: "Used to manage partners at Assistora, so he matches on keywords, but he left in 2023 (the reshuffle the founders mentioned); weak tie.",
    decoyPath: { userKey: "p03", strength: 2 },
    queryHint: "contact_employment ce join companies co on co.id = ce.company_id where co.name = 'Assistora' and ce.finished_on is null and ce.title ilike '%partner%' → join user_contacts order by strength desc (filtering on finished_on is null removes the decoy)",
  },
  {
    key: "G6",
    title: "Sanavo Care needs senior finance help",
    company: "Sanavo Care",
    needKind: "note",
    needSummary: "Implied need: Sanavo Care's CEO is doing the board pack herself, the first statutory audit is coming and finance is a junior controller. Nobody asked, but a fractional CFO with health-care experience is the fix.",
    note: {
      meetingType: "portfolio_checkin",
      sectionHeading: "Finance and reporting",
      bullets: [
        { text: "Board reporting is eating the CEO's time", subs: ["Roughly two weeks per quarter go into building the board pack by hand", "Finance is one junior controller plus an outsourced bookkeeper"] },
        { text: "First statutory audit is due next spring, and the new working-capital line comes with covenant reporting", subs: ["The bank wants monthly covenant tests from January", "Revenue recognition on municipal contracts is still done in spreadsheets"] },
      ],
      ask: "No explicit ask, but finance capacity is the obvious gap ahead of the audit; worth thinking about senior (possibly part-time) finance support with health-care experience.",
      nextStep: "think about senior part-time finance support for Sanavo before the audit",
    },
    best: {
      slug: "golden:g6:best", first: "Eveline", last: "Kortekaas", type: "expert", fn: "finance", level: 6, city: "Utrecht",
      tags: ["fractional CFO", "healthcare", "audit readiness", "board reporting", "debt financing", "FP&A"],
      headline: "Fractional CFO for health-care scale-ups",
      summary: "Fractional CFO for two or three health-care scale-ups at a time. I set up board reporting, prepare companies for their first audits and negotiate debt facilities. Previously CFO at Medilane and finance director in a hospital group.",
      email: "personal",
      history: [
        ["Rivierland Hospital Group", "Finance Director", "2011-01", "2016-12", "Group reporting, audits and municipal/insurer contracts."],
        ["Medilane", "CFO", "2017-01", "2022-03", "Led audit preparation, a debt facility and the Series B data room."],
        ["Self-employed", "Fractional CFO", "2022-04", null, "Part-time CFO for health-care scale-ups."],
      ],
    },
    bestWhy: "A fractional CFO who has done first audits, board reporting and debt covenants specifically in health care (hospital group + health-tech CFO); an operations participant knows her well.",
    warm: { userKey: "p15", strength: 4 },
    decoy: {
      slug: "golden:g6:decoy", first: "Jonas", last: "Petrakis", type: "candidate", fn: "finance", level: 1, city: "Utrecht",
      tags: ["FP&A", "healthcare", "financial reporting", "insurance"],
      headline: "Senior Financial Analyst at Dijkwacht Insurance",
      summary: "Senior financial analyst in the health insurance division of Dijkwacht Insurance. Interested in moving to a scale-up.",
      email: "personal",
      history: [
        ["Zuidas Advisory Group", "Audit Associate", "2019-09", "2022-08", null],
        ["Dijkwacht Insurance", "Senior Financial Analyst", "2022-09", null, "Forecasting for the health insurance division."],
      ],
    },
    decoyWhy: "Matches on 'healthcare' and 'financial reporting', but is far too junior to own a board pack or an audit; weak tie through a talent participant.",
    decoyPath: { userKey: "p07", strength: 2 },
    queryHint: "full-text search meeting_notes for 'board pack' / 'audit' (no explicit ask) → contacts where expertise_tags && '{fractional CFO,audit readiness}' and contact_type = 'expert' → prefer healthcare in tags/employment → max user_contacts.strength",
  },
  {
    key: "G7",
    title: "Windvane Grid needs a pilot with Veenstroom Energy",
    company: "Windvane Grid",
    needKind: "note",
    needSummary: "Explicit ask: who at Veenstroom Energy owns flexibility / grid innovation, for a residential battery aggregation pilot.",
    note: {
      meetingType: "portfolio_checkin",
      sectionHeading: "Utility pilot",
      bullets: [
        { text: "A pilot with a large supplier is the missing proof point before the Series B", subs: ["Target: aggregate ~2,000 home batteries and heat pumps for balancing services in 2027", "Veenstroom Energy has the customer base and a public flexibility target"] },
        { text: "Previous outreach went to Veenstroom's marketing team and went nowhere", subs: ["They need the person who owns flexibility and grid innovation, not retail marketing"] },
      ],
      ask: "Explicit ask: who do we know at Veenstroom Energy who owns flexibility or grid innovation? Need a pilot partner before the 2027 balancing-market changes.",
      nextStep: "intro Windvane to the owner of flexibility / grid innovation at Veenstroom Energy",
    },
    best: {
      slug: "golden:g7:best", first: "Reinout", last: "Hazelhoff", type: "corporate", fn: "energy_systems", level: 4, city: "Arnhem",
      tags: ["grid flexibility", "energy markets", "innovation", "battery storage", "pilots"],
      headline: "Head of Flexibility & Grid Innovation at Veenstroom Energy",
      summary: "I lead flexibility and grid innovation at Veenstroom Energy: aggregation of home batteries, heat pumps and EVs, and the pilots with startups that feed it. Previously energy markets at Greenhalm Energy.",
      email: "work",
      history: [
        ["Greenhalm Energy", "Energy Markets Lead", "2014-05", "2020-02", "Built the trading and balancing desk."],
        ["Veenstroom Energy", "Head of Flexibility & Grid Innovation", "2020-03", null, "Owns residential flexibility programmes and startup pilots."],
      ],
    },
    bestWhy: "Owns flexibility and grid innovation (including startup pilots) at the named utility; a general partner knows him very well.",
    warm: { userKey: "i02", strength: 5 },
    decoy: {
      slug: "golden:g7:decoy", first: "Yara", last: "Mertens", type: "corporate", fn: "marketing", level: 4, city: "Arnhem",
      tags: ["marketing", "energy", "brand", "customer acquisition"],
      headline: "Head of Retail Marketing at Veenstroom Energy",
      summary: "Head of retail marketing at Veenstroom Energy: brand, campaigns and customer acquisition.",
      email: "work",
      history: [
        ["Hopwise", "Marketing Manager", "2015-01", "2019-08", null],
        ["Veenstroom Energy", "Head of Retail Marketing", "2019-09", null, "Brand and customer acquisition for the retail business."],
      ],
    },
    decoyWhy: "Senior and at the right company, but in retail marketing: the team the founders already tried without success. Only a weak tie.",
    decoyPath: { userKey: "p13", strength: 1 },
    queryHint: "contacts c join companies co on co.id = c.current_company_id where co.name = 'Veenstroom Energy' and (c.current_title ilike '%flexib%' or c.current_title ilike '%innovation%' or 'grid flexibility' = any(c.expertise_tags)) → join user_contacts order by strength desc",
  },
  {
    key: "G8",
    title: "Grachtpay needs a Head of Sales for DACH",
    company: "Grachtpay",
    needKind: "job",
    needSummary: "Open job: Head of Sales, DACH at Grachtpay (Series B embedded payments, Berlin-based role).",
    job: ["Head of Sales, DACH", "sales", "director", "Berlin", 24],
    note: {
      meetingType: "portfolio_checkin",
      sectionHeading: "DACH expansion",
      bullets: [
        { text: "DACH is now the priority expansion market", subs: ["Three German marketplaces already live via partners; €1.8m of pipeline sitting there with nobody to work it", "Need a German-speaking sales leader who knows payments and can hire a team of 4–5 in Berlin"] },
      ],
      ask: "Explicit ask: referrals for the Head of Sales, DACH role: German-speaking, payments background, ideally has sold to marketplaces or platforms.",
      nextStep: "share Head of Sales DACH candidates with payments experience",
    },
    best: {
      slug: "golden:g8:best", first: "Konstantin", last: "Riedel", type: "candidate", fn: "sales", level: 4, city: "Munich",
      tags: ["payments", "enterprise sales", "DACH", "sales leadership", "marketplaces", "German"],
      headline: "Regional Sales Director DACH at Ravelpay | Payments",
      summary: "I lead sales for the DACH region at Ravelpay, selling acquiring and payouts to marketplaces and platforms. Native German speaker, based in Munich, open to moving to Berlin for the right role.",
      email: "personal",
      history: [
        ["Orbitdesk", "Account Executive", "2013-09", "2016-12", null],
        ["Tellerbird", "Senior Account Executive", "2017-01", "2020-12", "Sold restaurant payments across Germany and Austria."],
        ["Ravelpay", "Regional Sales Director DACH", "2021-01", null, "Leads a team of six selling to marketplaces and platforms in DACH."],
      ],
    },
    bestWhy: "Runs DACH sales at a payments company selling to marketplaces, native German speaker, has built a team, open to Berlin; a talent participant knows him very well.",
    warm: { userKey: "p07", strength: 5 },
    decoy: {
      slug: "golden:g8:decoy", first: "Lennart", last: "Bosch", type: "candidate", fn: "sales", level: 4, city: "Amsterdam",
      tags: ["sales leadership", "SaaS sales", "Benelux", "HR tech"],
      headline: "Head of Sales at Brightgrove HR",
      summary: "Head of Sales at Brightgrove HR, selling HR software to Dutch SMEs.",
      email: "work",
      history: [
        ["Mintleaf Software", "Account Executive", "2014-02", "2019-06", null],
        ["Brightgrove HR", "Head of Sales", "2019-07", null, "Leads Benelux SME sales."],
      ],
    },
    decoyWhy: "'Head of Sales' title matches, but Benelux-only HR software, no payments and no German; weak tie.",
    decoyPath: { userKey: "p04", strength: 2 },
    queryHint: "jobs j where j.title ilike '%Head of Sales%DACH%' → contacts where expertise_tags && '{payments,DACH}' and contact_type in ('candidate','corporate') → join user_contacts, prefer strength ≥ 4",
  },
];

/** Names reserved so the random name factory never reuses them. */
export const GOLDEN_NAMES = GOLDEN_SPECS.flatMap((s) => [s.best, s.decoy].map((p) => [p.first, p.last] as const));

export interface GoldenStageResult {
  scenarios: GoldenScenario[];
  contacts: ContactFixture[];
  employment: EmploymentFixture[];
  userContacts: UserContactFixture[];
  jobs: JobFixture[];
  meta: Record<string, ContactMeta>;
}

export function buildGolden(companies: CompanyFixture[], companyMeta: Record<string, CompanyMeta>, rng: Rng): GoldenStageResult {
  const byName = Object.fromEntries(companies.map((c) => [c.name, c]));
  const out: GoldenStageResult = { scenarios: [], contacts: [], employment: [], userContacts: [], jobs: [], meta: {} };

  const materialise = (p: GoldenPerson, scenarioKey: string): ContactFixture => {
    const id = stableId(`contact:${p.slug}`);
    const cur = p.history[p.history.length - 1];
    const curCo = byName[cur[0]] ?? null;
    const email = p.email === "work" && curCo
      ? `${emailLocal(p.first, p.last)}@${companyMeta[curCo.id].domain}`
      : p.email ? `${emailLocal(p.first, p.last)}@${rng.pick(["mailbox.example", "inbox.example", "postvak.example"])}` : null;
    const contact: ContactFixture = {
      id, first_name: p.first, last_name: p.last, email,
      linkedin_url: `https://www.linkedin.com/in/fictional-${slugify(`${p.first}-${p.last}`)}-${rng.hex(4)}`,
      headline: p.headline, summary: p.summary, location: `${p.city}, ${countryOf(p.city)}`,
      current_company_id: curCo?.id ?? null, current_company_name: cur[0], current_title: cur[1],
      contact_type: p.type, expertise_tags: p.tags, source: "seed",
    };
    out.contacts.push(contact);
    p.history.forEach(([co, title, start, end, desc], i) => {
      const company = byName[co] ?? null;
      out.employment.push({
        id: stableId(`employment:${id}:${i}`), contact_id: id, company_id: company?.id ?? null, company_name: co, title,
        description: desc, location: company ? company.hq_location : `${p.city}, ${countryOf(p.city)}`,
        started_on: monthToIso(monthOf(`${start}-01`)), finished_on: end ? monthToIso(monthOf(`${end}-01`)) : null,
      });
    });
    out.meta[id] = {
      id, fn: p.fn, level: p.level, homeCity: p.city, region: "golden", clusterId: null, betweenRoles: false,
      duplicateOf: null, golden: scenarioKey, portfolioRole: null, bgFn: p.fn,
      currentCompanyId: curCo?.id ?? null, currentCompanyName: cur[0], currentTitle: cur[1],
      currentStart: monthOf(`${cur[2]}-01`), currentEnd: null, positions: p.history.length,
    };
    return contact;
  };

  for (const s of GOLDEN_SPECS) {
    const company = byName[s.company];
    const best = materialise(s.best, s.key);
    const decoy = materialise(s.decoy, s.key);
    out.userContacts.push({ user_key: s.warm.userKey, contact_id: best.id, strength: s.warm.strength as UserContactFixture["strength"] });
    if ("userKey" in s.decoyPath) {
      out.userContacts.push({ user_key: s.decoyPath.userKey, contact_id: decoy.id, strength: s.decoyPath.strength as UserContactFixture["strength"] });
    }
    let jobId: string | null = null;
    if (s.job) {
      const [title, department, seniority, location, ago] = s.job;
      const job = makeJob(company, companyMeta[company.id], [title, department, seniority], rng, {
        status: "open", location, remote_policy: "hybrid", employment_type: "full-time", posted_on: daysAgo(ago),
      });
      out.jobs.push(job);
      jobId = job.id;
    }
    out.scenarios.push({
      key: s.key, title: s.title, needKind: s.needKind, needSummary: s.needSummary, companyId: company.id, jobId,
      noteId: null, noteNeedText: s.note.bullets.map((b) => b.text),
      bestContactId: best.id, bestWhy: s.bestWhy, warmPath: s.warm,
      decoyContactId: decoy.id, decoyWhy: s.decoyWhy,
      decoyPath: "userKey" in s.decoyPath ? s.decoyPath : { overlapVia: best.id, company: s.decoyPath.company },
      queryHint: s.queryHint,
    });
  }
  return out;
}

export const goldenSpecFor = (companyName: string) => GOLDEN_SPECS.find((s) => s.company === companyName);
