/**
 * Topic sections for notes with portfolio companies (check-ins and founder
 * catch-ups). Each generator returns MORE bullets than a note needs; the
 * composer trims them to hit the target length. Headings, sentence shapes
 * and numbers all vary, so 70+ portfolio notes don't read like clones.
 */
import { monthName, shortDate } from "../dates";
import { listify } from "../employment";
import { bullet, byWhen, fullName, leadUser, mentionContact, t, userToken, userWithRole, type Bullet, type NoteCtx, type Section } from "./context";
import { money, num } from "./grammar";
import { profileKey } from "./industry";

type Gen = (ctx: NoteCtx) => Section | null;

const h = (ctx: NoteCtx, options: string[]) => t(ctx, ctx.rng.pick(options));

// ---------------------------------------------------------------------------
export const performance: Gen = (ctx) => {
  const m = ctx.metrics!;
  const ind = profileKey(ctx.company!.name, ctx.cmeta!.industryKey!);
  const diff = Math.round(((m.arr - m.planArr) / m.planArr) * 100);
  const planLine = diff >= 0
    ? `About ${Math.max(1, diff)}% ahead of the board plan of ${money(m.planArr)}, [helped by|mostly thanks to] [faster self-serve conversion|an early renewal with expansion|a bigger-than-expected expansion at their largest customer]`
    : `About ${Math.abs(diff)}% behind the board plan of ${money(m.planArr)}; [two enterprise deals slipped into {nextQ}|one large renewal was delayed|new-logo volume was lighter than planned in {monthPrev}]`;
  const vol: Record<string, Bullet> = {
    fintech: bullet(ctx, `${money(m.volume)} [processed|in payment volume] last month at a take rate of ${m.takeRate} bps`, ["Volume [growing faster than|roughly in line with] revenue as [larger customers ramp up|the older cohorts mature]"]),
    circular: bullet(ctx, `${num(m.volume * 40)} reusable crates in circulation across ${Math.max(3, Math.round(m.customers * 4))} stores`, [`[Return rate|Crate return rate] [at|around] ${ctx.rng.int(88, 97)}%; [average|each] crate [does|completes] ${ctx.rng.int(6, 14)} trips a quarter`, "[Washing|Cleaning] capacity [is the constraint|is fine for now] [in peak weeks|until {nextQ}]"]),
    climate: bullet(ctx, `${num(m.volume)} systems [installed to date|live in the field], with a backlog of ${num(m.volume * 0.18 + 12)} signed jobs`, ["[Average job value|Average order value] [around|about] " + money(m.arr / Math.max(1, m.volume) * 2.1), "[Installation|Hardware] margin [improving|under some pressure] as [volumes grow|component prices move]"]),
    saas: bullet(ctx, `${num(m.volume)} weekly active users across ${m.customers} customers`, ["[Daily-to-weekly|DAU/WAU] ratio [up to|now] " + ctx.rng.int(38, 64) + "%, the best engagement number so far"]),
    health: bullet(ctx, `${num(m.volume)} active patients across ${Math.max(2, Math.round(m.customers))} [contracted sites|clinics|contracts]`, ["[Patient retention at 90 days|90-day adherence] [around|at] " + ctx.rng.int(64, 88) + "%"]),
    devtools: bullet(ctx, `${num(m.volume)} weekly active developers; free-to-paid conversion [at|around] ${(ctx.rng.int(18, 52) / 10).toFixed(1)}%`, ["[Most paid conversions|Most upgrades] come from teams that hit the [free-tier limit|seat cap] within [two|three] weeks"]),
    marketplace: bullet(ctx, `GMV of ${money(m.volume)} last month at a ${m.takeRate}% take rate`, [`Repeat buyers now ${ctx.rng.int(28, 61)}% of GMV`, "[Supply|Fill rate] [is the constraint|is holding up] in [the busiest cities|peak weeks]"]),
    aiinfra: bullet(ctx, `${num(m.volume / 1000)}k inference requests last month, up ${ctx.rng.int(12, 48)}% [month on month|MoM]`, [`Compute costs at ${100 - m.grossMargin}% of revenue; [target is below|aiming for under] ${Math.max(15, 100 - m.grossMargin - 12)}%`]),
  };
  const bullets: Bullet[] = [
    bullet(ctx, `[ARR|Annualised revenue|Run-rate revenue] [at|now at|landed at] {arr}, [up {g}% quarter on quarter|+{g}% QoQ|up {g}% versus last quarter]`, [
      `[${m.newLogos} new customers|${m.newLogos} new logos] in the quarter; [largest|biggest] new contract ${money(m.largestDeal)} ACV`,
      planLine,
    ]),
    bullet(ctx, `Net revenue retention [around|at|holding at] ${m.nrr}%`, [
      `[Expansion|Growth within accounts] driven by ${ctx.rng.pick(ctx.profile!.expansionDrivers)}`,
      m.churned ? `${m.churned} [${m.churned === 1 ? "logo" : "logos"}|${m.churned === 1 ? "customer" : "customers"}] churned: ${ctx.rng.pick(ctx.profile!.churnReasons)}` : t(ctx, "[No logo churn this quarter|No customers lost in {prevQ}|Zero churned logos; one downgrade]"),
    ]),
    bullet(ctx, `[Net burn|Burn] [averaging|at|running at] ${money(m.burn)}/month, runway [to|until] {runwayDate} ({runway} months)`, [
      `Gross margin [at|now] ${m.grossMargin}%[, up ${ctx.rng.int(1, 6)} points on last quarter|, flat on last quarter|]`,
      `[{ceo} wants to keep|The plan keeps] the burn multiple [under|below] ${(ctx.rng.int(12, 25) / 10).toFixed(1)}x`,
    ]),
    vol[ind],
    bullet(ctx, `${m.customers} [paying customers|customers] [at an average|with an average] contract value of ${money(m.arr / m.customers)}`, [
      `Top 10 customers are ${ctx.rng.int(22, 58)}% of revenue[, down from ${ctx.rng.int(59, 70)}% a year ago|]`,
    ]),
    bullet(ctx, `Cash in the bank [at|around] ${money(m.burn * m.runway)}[ after the last tranche|]`, [
      "[Collections|Receivables] [healthy|slightly slower]; DSO [around|at] " + ctx.rng.int(28, 61) + " days",
      "[No covenant questions from the bank this quarter|Bank reporting is now automated from the finance system|The bank asked for quarterly management accounts going forward|Debt facility untouched; kept as a buffer|Treasury moved to a higher-yield account at the house bank]",
    ]),
    bullet(ctx, `[Monthly|Month-on-month] revenue growth [averaged|ran at] ${Math.max(1, Math.round(m.growthQoQ / 3))}% over the quarter`, [
      "[Strongest|Best] month was [{monthPrev}|the last one], [helped by|thanks to] [a large expansion|seasonality|a pricing change]",
    ]),
  ];
  ctx.summaryBits.push(t(ctx, `ARR at {arr} (+{g}% QoQ)`));
  return { key: "performance", heading: h(ctx, ["{prevQ} performance", "Numbers since last check-in", "Trading update", "Commercial traction", "Where the numbers are", "Revenue & growth", "KPIs"]), bullets: [bullets[0], ...ctx.rng.shuffle(bullets.slice(1))] };
};

/** Sales headcount scales with stage: seed companies have one AE, not nine. */
function salesTeamLine(ctx: NoteCtx): string {
  const [aeLo, aeHi, sdrHi] = ({ "pre-seed": [1, 1, 0], seed: [1, 2, 1], "series-a": [2, 5, 2], "series-b": [5, 10, 4], "series-c+": [9, 16, 6] } as Record<string, number[]>)[ctx.company!.stage!];
  const ae = ctx.rng.int(aeLo, aeHi);
  const sdr = ctx.rng.int(0, sdrHi);
  const aes = ae === 1 ? "one AE" : `${ae} AEs`;
  const sdrs = sdr === 0 ? ", founders still doing most discovery calls" : ` and ${sdr === 1 ? "one SDR" : `${sdr} SDRs`}`;
  return `Sales team: ${aes} [in seat|ramped]${sdrs}`;
}

// ---------------------------------------------------------------------------
export const pipeline: Gen = (ctx) => {
  const m = ctx.metrics!;
  const corp = ctx.rng.pick(ctx.world.companies.filter((c) => c.kind === "corporate" && ctx.profile!.corpKinds.includes(ctx.world.companyMeta[c.id].corpKind!) && !["Noordhaven Bank", "Assistora", "Veenstroom Energy", "Huisgoed Retail Group"].includes(c.name)));
  const champion = corp ? mentionContact(ctx, (c) => c.current_company_id === corp.id && c.contact_type === "corporate") : null;
  const bullets: Bullet[] = [
    bullet(ctx, `Weighted pipeline of ${money(m.pipeline)} for {nextQ}, [with|and] ${ctx.rng.int(3, 11)} deals in [late stage|contract negotiation|the final stages]`, [
      corp ? `[Biggest|Largest] opportunity: ${corp.name} at ~${money(Math.min(m.largestDeal * ctx.rng.int(1, 3), m.arr * 0.3))}${champion ? `; champion is ${fullName(champion)} (${champion.current_title})` : ""}` : "Largest opportunity sits with a mid-sized customer in Belgium",
      `Win rate ${m.winRate}% over the last two quarters`,
    ]),
    bullet(ctx, `Sales cycle [averaging|now around|currently] ${m.cycleDays} days[, up from ${Math.round(m.cycleDays * 0.8)} as deal sizes grow|, roughly stable|]`, [
      "[Security reviews|Procurement and legal|Data-protection questionnaires|Pilot sign-off by a second department] add [three to four|two to three|four to six] weeks on larger deals",
    ]),
    bullet(ctx, `Inbound [now|is] [about|roughly] ${ctx.rng.int(25, 70)}% of new pipeline`, [
      "[Content and community are doing most of the work|Word of mouth from existing customers is the main source|Partner referrals are the main source|Webinars with customers convert best|An industry newsletter they sponsor drives a surprising share|Founder posts and talks still drive most of it]",
      `[Outbound|Cold outbound] [works best with|converts best with] ${ctx.rng.pick(ctx.profile!.buyers)}`,
    ]),
    bullet(ctx, `Competition: [mostly up against|losing most often to|seeing a lot more of] {competitor}`, [
      "[Win|They win] when [time to value|integration depth|local support|compliance depth] matters; [lose|they lose] on [price|brand recognition|breadth of features]",
      `[Lost|Dropped] ${ctx.rng.pick(["one deal", "two deals", "three deals"])} [last quarter|this quarter] [on price alone|to a bundled offer]`,
    ]),
    bullet(ctx, salesTeamLine(ctx), [
      `[Quota attainment|Attainment] [at|around] ${ctx.rng.int(58, 104)}% [for ramped reps|across the team]`,
      "[First|New] sales manager [started|starts] in {month}",
    ]),
    bullet(ctx, `[Average deal size|ACV on new deals] [up|trending up] to ${money(m.arr / Math.max(1, m.customers) * 1.3)}[ as they move upmarket|]`, [
      "[Larger|Bigger] deals [bring|come with] [longer pilots|more stakeholders|stricter security reviews]",
    ]),
    bullet(ctx, `[Self-serve|Product-led] [signups|trials] [at|around] ${ctx.rng.int(40, 400)} a month, ${ctx.rng.int(3, 14)}% [convert|converting] to paid`, [
      "[Activation|Time to first value] [is the main lever|still too slow] for [smaller teams|SMB accounts]",
    ]),
  ];
  return { key: "pipeline", heading: h(ctx, ["Pipeline & sales", "Go-to-market", "Sales pipeline", "Commercial pipeline", "Sales motion"]), bullets };
};

// ---------------------------------------------------------------------------
export const product: Gen = (ctx) => {
  const p = ctx.profile!;
  const [s1, s2] = ctx.rng.sample(p.shipped, 2);
  const [r1, r2] = ctx.rng.sample(p.roadmap, 2);
  const bullets: Bullet[] = [
    bullet(ctx, `Shipped ${s1}`, [
      `[Adoption|Early adoption] at ${ctx.rng.int(18, 72)}% of active customers [after ${ctx.rng.int(2, 8)} weeks|in the first month]`,
      `[Feedback|Customer feedback] [mostly positive|positive overall]; [main request is|biggest gap is] ${r2}`,
    ]),
    bullet(ctx, `[Also shipped|Released] ${s2}[ ahead of schedule| a few weeks late|]`, [`[Took|It took] ${ctx.rng.int(3, 11)} weeks with [two|three|four] engineers`]),
    bullet(ctx, `Next [big bet|priority|up]: ${r1}`, [
      `[Targeting|Aiming for] [${monthName(ctx.date) === "December" ? "February" : "end of {nextQ}"}|end of {nextQ}|{nextQ}]`,
      "[Needs two more engineers to hit that date|Depends on the senior backend hire landing|Tight with the current team; might slip by a few weeks|Design is the bottleneck, engineering is ready|{cto} thinks the date is realistic if scope stays fixed]",
    ]),
    bullet(ctx, `[Spending|Spent] ~${ctx.rng.int(15, 35)}% of engineering time on [reliability|platform work|paying down technical debt]`, [
      `[Incidents|Customer-facing incidents] down from ${ctx.rng.int(5, 12)} to ${ctx.rng.int(1, 4)} per month`,
      "{cto} wants to [keep that ratio through {nextQ}|bring it down once the platform work lands|protect that time even when sales asks for features]",
    ]),
    bullet(ctx, `[Prototyping|Exploring|Shipped a first version of] AI assistance for [the most repetitive workflows|data entry and categorisation|first-line support questions]`, [
      "[Still unclear whether to charge for it separately|Pricing for it undecided: add-on vs. included in the top tier|Plan is to include it for free until usage is proven|Considering a usage-based add-on for it]",
      `[Early|First] users report [saving|saving roughly] ${ctx.rng.int(2, 9)} hours a week`,
    ]),
    bullet(ctx, "[Customer advisory board|Design-partner group] [met|ran] [last month|in {monthPrev}] with [six|eight|five] customers", [
      "[Top request|Most requested]: [better reporting|deeper integrations|role-based permissions|an API]",
      "[Validated the next two roadmap items|Confirmed willingness to pay for the new module|Killed one planned feature nobody wanted|Surfaced a reporting gap the team had underestimated]",
    ]),
    bullet(ctx, `Engineering team at ${ctx.rng.int(5, 40)} people in [three|four|five] squads`, [
      "[Deploys|Releases] [daily|several times a day|weekly], [lead time|cycle time] [down|improving]",
    ]),
  ];
  return { key: "product", heading: h(ctx, ["Product & roadmap", "Product update", "Roadmap", "What shipped", "Product"]), bullets };
};

// ---------------------------------------------------------------------------
export const hiring: Gen = (ctx) => {
  const m = ctx.metrics!;
  const bullets: Bullet[] = [];
  const live = ctx.jobs.filter((j) => j.posted_on <= ctx.date);
  const future = ctx.jobs.filter((j) => j.posted_on > ctx.date && j.status !== "filled");
  const challenges: Record<string, string[]> = {
    engineering: ["competing with big-tech salaries in Amsterdam", "candidates dropping out after the take-home", "finding people with the right infrastructure depth"],
    sales: [`finding AEs who have sold to ${ctx.rng.pick(ctx.profile!.buyers)}`, "candidates wanting a higher base than budgeted", "too many applicants without B2B experience"],
    marketing: ["most candidates are B2C", "unclear whether to hire a generalist or a demand-gen specialist"],
    product: ["candidates want more seniority than the role", "balancing technical depth and customer focus"],
    ops: ["the role mixes strategy and hands-on work, which narrows the pool"],
    finance: ["candidates prefer later-stage companies"],
    people: ["deciding between an HR generalist and a recruiter first"],
    exec: ["few people have done it at this stage in Europe", "compensation expectations above the plan"],
  };
  bullets.push(bullet(ctx, `Team at ${m.headcount} [people|FTE], [plan|aim] to reach ${Math.round(m.headcount * (1 + ctx.rng.int(15, 45) / 100))} by [the end of {nextQ}|end of {nextYear}]`, [
    `[Attrition|Regretted attrition] [low|${ctx.rng.int(0, 3)} people] [this year|in the last six months]`,
  ]));
  for (const j of ctx.rng.sample(live, 3)) {
    if (j.status === "filled") {
      bullets.push(bullet(ctx, `Closed the ${j.title} hire[; starts in ${monthName(ctx.date)}|, starting next month|]`, ["[Took|Search took] [six|eight|ten] weeks from posting to signed offer"]));
    } else if (j.status === "paused") {
      bullets.push(bullet(ctx, `${j.title} search [paused|on hold] while they [revisit the plan|wait for the round to close|re-scope the role]`, ["[Will|Plan to] [revisit|reopen] [in {nextQ}|after the board meeting]"]));
    } else {
      const weeks = Math.max(1, Math.round((Date.parse(ctx.date) - Date.parse(j.posted_on)) / (7 * 86400000)));
      bullets.push(bullet(ctx, `${j.title} (${j.location}): [open|live] for ${weeks} week${weeks === 1 ? "" : "s"}`, [
        `${ctx.rng.int(2, 9)} candidates in process, [one at final round|two at final round|none at offer yet]`,
        `[Main challenge is|Struggling with] ${ctx.rng.pick(challenges[j.department])}`,
      ]));
    }
  }
  for (const j of ctx.rng.sample(future, 1)) {
    bullets.push(bullet(ctx, `[Planning to open|Will open] a ${j.title} role [in ${monthName(j.posted_on)}|in the next few weeks|once the plan is signed off]`, ["[Job description|Scorecard] [being drafted|in draft]; {lead} [offered to review|to review]"]));
  }
  const talent = ctx.users.find((u) => u.role === "talent");
  if (talent) bullets.push(bullet(ctx, `${userToken(talent.key)} [offered to help with|will support] [sourcing|calibrating the scorecard|closing candidates|the interview process]`, ["[Kick-off call|First call] with the hiring manager [booked|planned] for [next week|{soon}]"]));
  bullets.push(bullet(ctx, "[Salary bands|Comp bands] [being benchmarked|due a refresh]; [option pool top-up|ESOP refresh] needed before [the next round|{nextQ}]", [`Current pool has ~${(ctx.rng.int(12, 45) / 10).toFixed(1)}% unallocated`]));
  bullets.push(
    bullet(ctx, "[Recruiting|Hiring] [mostly|largely] [in-house|via referrals|through one external agency]", [
      `[Referrals|Employee referrals] [account for|make up] ${ctx.rng.int(20, 55)}% of hires this year`,
      "[Time to hire|Average time to hire] [around|about] " + ctx.rng.int(30, 70) + " days",
    ]),
    bullet(ctx, "[Onboarding|New-joiner onboarding] [being reworked|still ad hoc]; [buddy system|30-60-90 plans] [introduced|planned]", ["[New joiners|Recent hires] [rate|scored] onboarding " + ctx.rng.int(6, 9) + "/10[, up from last quarter|]"])
  );
  return { key: "hiring", heading: h(ctx, ["Hiring", "Team & hiring", "People & hiring", "Org & hiring", "Team"]), bullets };
};

// ---------------------------------------------------------------------------
export const fundraising: Gen = (ctx) => {
  const m = ctx.metrics!;
  const focus = ctx.cmeta!.industryKey!;
  const fundIds = new Set(ctx.world.companies.filter((c) => c.kind === "investor" && ctx.world.companyMeta[c.id].focus.includes(focus)).map((c) => c.id));
  const inv = mentionContact(ctx, (c) => c.contact_type === "investor" && !!c.current_company_id && fundIds.has(c.current_company_id));
  const bullets: Bullet[] = [
    bullet(ctx, `Runway [to|until] {runwayDate}; [plan is to raise|planning to raise] a {nextRound} of [around {raiseAmount}|~{raiseAmount}] [in|starting in] {raiseQ}`, [
      `Target metrics for the round: ${money(m.arr * 1.8)} ARR with [growth above ${Math.max(8, m.growthQoQ - 4)}% QoQ|NRR above 110%]`,
    ]),
    bullet(ctx, `[Want|Targeting] investors who know {industry}[ and can help with US expansion| and have led rounds at this stage before|]`, [
      inv ? `${fullName(inv)} (${inv.current_company_name}) [already asked for the deck|reached out after the last update|met {ceo} at a dinner last month]` : "[A few|Several] funds have reached out inbound",
      "[Prefers|Wants] to run a tight process: [four|six] weeks from first meetings to term sheet",
    ]),
    bullet(ctx, `Stroopwafel [plans to|will likely] [take its pro-rata|support with pro-rata|consider an internal extension if the market is slow]`, [`${userToken(leadUser(ctx))} to discuss [with the partnership|at the next partner meeting]`]),
    bullet(ctx, `Considering [venture debt|a revenue-based facility] to extend runway by [six|four to six] months`, ["[Two lenders|One bank and one specialist lender] [have sent indicative terms|are in conversation]"]),
    bullet(ctx, `[Valuation expectations|Expectations on valuation] [realistic|ambitious]: [${ctx.rng.int(8, 20)}x ARR|a step up of ~2x on the last round]`, [
      "{lead} [cautioned against anchoring on the headline number|suggested a clean structure matters more than headline valuation|suggested anchoring on growth quality instead]",
    ]),
    bullet(ctx, "[Data room|Investor materials] [being prepared|about 60% ready]; [cohort analysis|the bottom-up model] [still missing|needs work]", ["[Target|Aim] is to have it [ready|complete] [six weeks before|well before] the first meetings"]),
  ];
  ctx.summaryBits.push(t(ctx, "{nextRound} planned for {raiseQ}"));
  return { key: "fundraising", heading: h(ctx, ["Fundraising plans", "Runway & next round", "Capital plan", "Next round"]), bullets };
};

// ---------------------------------------------------------------------------
export const board: Gen = (ctx) => {
  const next = new Date(Date.parse(`${ctx.date}T00:00:00Z`) + ctx.rng.int(14, 45) * 86400000).toISOString().slice(0, 10);
  const bullets: Bullet[] = [
    bullet(ctx, `Next board meeting [on|scheduled for] ${shortDate(next)}`, [
      `Agenda: [the {nextYear} budget|the hiring plan|pricing changes|the fundraising timeline] and [a product deep-dive|the sales capacity model|the pipeline review]`,
      "{ceo} [will circulate|to circulate] the pack a week ahead",
    ]),
    bullet(ctx, "[Discussed|Raised] adding an independent board member[ with go-to-market experience| with a finance background| who has scaled a company to 200+ people|]", ["[No names yet; a long-list of three to five names|A long-list of three to five names] [is due|expected] by the next meeting"]),
    bullet(ctx, "Board pack [quality improving|getting sharper]; [request to add|ask to add] [cohort retention|cash runway scenarios|pipeline coverage|hiring vs. plan] to the KPI page", ["[Also|And] a [one-page|short] summary [up front|at the start] [for|so] [board members|investors] can skim"]),
    bullet(ctx, "[Option grants|ESOP grants] for [the last four hires|recent hires] to be approved [at the next meeting|by written resolution]", ["[Pool|The pool] [has enough room|is getting tight] [for|given] the hiring plan"]),
    bullet(ctx, `[Budget|Plan] for {nextYear} [assumes|built on] ${ctx.rng.int(60, 140)}% revenue growth and [${ctx.rng.int(8, 40)} net new hires|a flat burn]`, [
      "[Board|Investors] will [likely|probably] push for a [downside scenario|slower hiring plan]",
    ]),
  ];
  return { key: "board", heading: h(ctx, ["Board prep", "Governance", "Board topics", "Board & reporting"]), bullets };
};

// ---------------------------------------------------------------------------
export const partnerships: Gen = (ctx) => {
  const others = ctx.world.companies.filter((c) => c.kind === "portfolio" && c.id !== ctx.company!.id);
  const peer = ctx.rng.pick(others);
  const corp = ctx.rng.pick(ctx.world.companies.filter((c) => c.kind === "corporate" && ctx.profile!.corpKinds.includes(ctx.world.companyMeta[c.id].corpKind!) && !["Noordhaven Bank", "Assistora", "Veenstroom Energy", "Huisgoed Retail Group"].includes(c.name)));
  const bullets: Bullet[] = [
    bullet(ctx, `[Early conversations|In talks|Pilot discussions] with ${corp.name} about [a referral partnership|a joint offering|a paid pilot]`, [
      "[Moving slowly|Slow going]: [legal review|procurement onboarding|their budget cycle] is the bottleneck",
      `[Could be worth|Potential value] ${money(Math.min(ctx.metrics!.largestDeal * ctx.rng.int(2, 6), ctx.metrics!.arr * 0.4))} in the first year if it works`,
    ]),
    bullet(ctx, `Partner-sourced pipeline [now|at] ${ctx.rng.int(8, 35)}% of total`, ["[Want to|Aim to] double that by [the end of {nextQ}|end of {nextYear}]"]),
    bullet(ctx, `Exploring an integration with ${peer.name} (also Stroopwafel portfolio)`, [`[{ceo} has met|Intro made via ${userToken(userWithRole(ctx, ["platform", "community"]))} to] their founders`]),
    bullet(ctx, "[Referral|Reseller] partners: [two signed, one live|three in onboarding|first one producing leads]", [
      "[Revenue share|Referral fee] of [10–20%|15%] [in year one|on first-year revenue]",
    ]),
    bullet(ctx, "[Co-marketing|Joint webinar] [planned|scheduled] for {nextMonth} with [an accounting firm|an industry association|a portfolio company]", ["[Expect|Aiming for] [100–200|a few hundred] [registrations|sign-ups] [from|across] [target accounts|their ICP]"]),
  ];
  return { key: "partnerships", heading: h(ctx, ["Partnerships", "Corporate partnerships", "Channel & partners", "Partners"]), bullets };
};

// ---------------------------------------------------------------------------
export const customers: Gen = (ctx) => {
  const m = ctx.metrics!;
  const bullets: Bullet[] = [
    bullet(ctx, `[Largest|Top] customer [renewed|expanded] [for|to] ${money(Math.min(m.largestDeal * ctx.rng.int(2, 4), m.arr * 0.22))}[ on a two-year term| with a 12% uplift|]`, ["[Champion|Their champion] [now|has become] a [reference customer|reference] for [similar deals|enterprise prospects]"]),
    bullet(ctx, `${ctx.rng.int(2, 7)} accounts flagged [at risk|amber] in the [last health review|latest QBR round]`, [
      "[Mostly|Main causes]: [low usage after onboarding|a champion leaving|budget cuts]",
      "[[Customer success|CS] has a save plan for each; one already back to green|Weekly check-ins with each of them until renewal|Two of them are on legacy pricing and up for renewal in {nextQ}|{ceo} is personally calling the largest one]",
    ]),
    bullet(ctx, `[NPS|Net promoter score] at ${ctx.rng.int(28, 64)}[, up from ${ctx.rng.int(15, 30)}|]`, ["[Detractors|Most complaints] mention [onboarding time|reporting gaps|support response times]"]),
    bullet(ctx, `Onboarding time [down to|now] ${ctx.rng.int(5, 30)} days[ from ${ctx.rng.int(31, 60)}|]`, ["[Driven by|Thanks to] [templates|a guided setup|a dedicated onboarding specialist]"]),
    bullet(ctx, `[Support tickets|Ticket volume] per customer [down|falling] ${ctx.rng.int(8, 35)}% [quarter on quarter|since the onboarding rework]`, [
      "[First response time|Median first response] [under|around] " + ctx.rng.int(1, 6) + " hours",
    ]),
    bullet(ctx, "[Two|Three] [case studies|customer stories] [published|in the works] with [named|referenceable] customers", ["[Sales|The sales team] [uses|is using] them in [late-stage deals|most proposals]"]),
  ];
  return { key: "customers", heading: h(ctx, ["Customers", "Retention & churn", "Customer health", "Customer feedback"]), bullets };
};

// ---------------------------------------------------------------------------
export const regulation: Gen = (ctx) => {
  const regs = ctx.profile!.regulation;
  if (!regs.length) return null;
  const [r1, r2] = ctx.rng.sample(regs, 2);
  const bullets: Bullet[] = [
    bullet(ctx, `${r1[0].toUpperCase() + r1.slice(1)}: [on track for|expected in|targeting] {nextQ}`, [
      `[External counsel|Outside counsel] [budgeted at|costing] ${money(ctx.rng.int(20, 120) * 1000)}`,
      "[Risk|Main risk]: [regulator timelines|auditor capacity|documentation gaps] could push it [a quarter|by a few months]",
    ]),
    ...(r2 ? [bullet(ctx, `[Also tracking|Keeping an eye on] ${r2}`, ["[Not urgent yet|Low impact for now], but [enterprise customers ask about it|it will come up in due diligence]"])] : []),
    bullet(ctx, "[Compliance|Risk and compliance] owner [is {cto} for now|sits with {ceo} for now|is a part-time consultant]", ["[Wants|Plans] a dedicated hire [next year|after the round]"]),
    bullet(ctx, "[Data-protection|Privacy] reviews [are now standard|come up] in [every|most] enterprise deals", [
      "[Standard|Pre-filled] [DPA and security pack|questionnaire answers] [saves|cuts] about a week per deal",
    ]),
  ];
  return { key: "regulation", heading: h(ctx, ["Regulatory & compliance", "Compliance", "Regulatory"]), bullets };
};

// ---------------------------------------------------------------------------
export const pricing: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, `[Current model|Pricing today]: ${ctx.rng.pick(ctx.profile!.pricing)}`, [`[Discounting|Average discount] [running at|around] ${ctx.rng.int(8, 28)}% on new deals`]),
    bullet(ctx, `[Testing|Planning] a [${ctx.rng.int(8, 25)}% price increase|new top tier] for new customers from [${monthName(ctx.date)}|next quarter|{nextQ}]`, ["[Existing customers|The installed base] [grandfathered|moved over] at renewal"]),
    bullet(ctx, `CAC payback [at|around] ${ctx.rng.int(8, 26)} months, LTV to CAC [roughly|around] ${(ctx.rng.int(18, 52) / 10).toFixed(1)}x`, ["Paid channels [getting more expensive|flat] quarter on quarter"]),
    bullet(ctx, `Gross margin by customer segment [ranges|varies] from ${ctx.rng.int(40, 60)}% to ${ctx.rng.int(65, 88)}%`, [
      "[Smallest|Smaller] customers [least profitable|barely profitable] after support costs",
    ]),
    bullet(ctx, `[Annual prepay|Upfront annual billing] [now|at] ~${ctx.rng.int(25, 70)}% of new contracts[, up from last quarter|]`, ["[Helps|Improves] [cash|working capital] [noticeably|meaningfully] [in Q1|at the start of the year]"]),
  ];
  return { key: "pricing", heading: h(ctx, ["Pricing", "Pricing & packaging", "Unit economics"]), bullets };
};

// ---------------------------------------------------------------------------
export const expansion: Gen = (ctx) => {
  const [mk1, mk2] = ctx.rng.sample(ctx.profile!.markets, 2);
  const bullets: Bullet[] = [
    bullet(ctx, `${mk1} [is next|is the priority market], [first hire|a country lead] planned for {nextQ}`, [
      `${ctx.rng.int(5, 30)}% of pipeline already comes from ${mk1}`,
      "[Localisation|Legal entity and VAT setup] [in progress|budgeted at " + money(ctx.rng.int(30, 90) * 1000) + "]",
    ]),
    bullet(ctx, `${mk2} [on hold|parked] until ${mk1} [proves out|hits ${ctx.rng.int(10, 30)} customers]`, ["[Inbound|Inbound interest] from there [handled|served] [remotely|from Amsterdam] [for now|in the meantime]"]),
    bullet(ctx, "[Considering|Debating] whether to [enter through partners first|hire a local team straight away]", ["{ceo} [leans towards|prefers] partners; {lead} [pushed back|suggested testing both]"]),
    bullet(ctx, "[Customer support|Support] in [German|the local language] [needed|required] [from day one|within six months]", [
      "[Plan|Option]: [hire locally|use a partner|start with a part-time contractor]",
    ]),
  ];
  return { key: "expansion", heading: h(ctx, ["International expansion", "Expansion", "Market entry", "New markets"]), bullets };
};

// ---------------------------------------------------------------------------
export const competition: Gen = (ctx) => {
  const [c1, c2] = ctx.rng.sample(ctx.profile!.competitors, 2);
  const bullets: Bullet[] = [
    bullet(ctx, `${c1[0].toUpperCase() + c1.slice(1)} [raised a large round|announced a European launch|cut prices] [this summer|last month|recently]`, [
      "[No impact yet|Little impact so far] on win rates, [but|though] [it shows up in more deals|prospects mention it more often]",
    ]),
    bullet(ctx, `Win-loss review of the last ${ctx.rng.int(10, 30)} deals: [most losses|the majority of losses] [to|against] ${c2}`, ["[Main reason|Reason given]: [price|existing relationship|feature breadth]"]),
    bullet(ctx, "[Positioning|Messaging] [being sharpened|reworked] around [time to value|local support and compliance|depth of integrations]", ["[New|Updated] [website|deck] [copy|messaging] [live|launching] in [{nextMonth}|the coming weeks]"]),
    bullet(ctx, "[Switching costs|Lock-in] [higher|stronger] than expected: [two|three] customers [came back|returned] after trying a competitor", ["[Data migration|Retraining staff] [cited as|was] the [main|biggest] reason"]),
    bullet(ctx, "[Analyst|Market] [coverage|reports] [starting to|beginning to] [mention them|include the category]", ["[Worth|Could be worth] a [briefing|short call] [in {nextQ}|before the round]"]),
  ];
  return { key: "competition", heading: h(ctx, ["Competitive landscape", "Competition", "Market"]), bullets };
};

// ---------------------------------------------------------------------------
export const leadership: Gen = (ctx) => {
  const bullets: Bullet[] = [
    bullet(ctx, "{ceo} [feeling stretched|sounds energised|feels more in control than last quarter|is tired but upbeat]", [
      `[Spending|Still spending] ~${ctx.rng.int(30, 60)}% of [their|the] week on [sales|hiring|fundraising prep]`,
      "[Wants to|Plans to] [hand over|delegate] [day-to-day sales|recruiting|operations] [by|before] {nextQ}",
    ]),
    bullet(ctx, "Co-founder dynamics [good|healthy|in a better place]; [clearer split of responsibilities|clear ownership] between {ceo} and {cto}", ["[Weekly|Fortnightly] founder 1:1 [reintroduced|working well]"]),
    bullet(ctx, "[Considering|Open to] [an executive coach|a CEO peer group|a mentor who has been through the next stage]", [`${userToken(userWithRole(ctx, ["platform", "community", "operations"]))} to share [options|a shortlist]`]),
    bullet(ctx, "Leadership team [is gelling|still uneven]: [strongest|most effective] in [product|engineering|sales], [thinnest|weakest] in [finance|people|operations]", ["[Next|Upcoming] [senior|leadership] hire [likely|probably] in [one of the thin areas|that area]"]),
    bullet(ctx, "[Asked for advice on|Wanted advice on] [how to run a leadership offsite|setting OKRs for {nextYear}|letting go of an early employee]", [
      "{lead} [shared a template from another portfolio company|shared how two other founders approached it|offered to connect them with a founder who did the same]",
    ]),
    bullet(ctx, "[Taking|Planning] [a proper holiday|a week off] in [{nextMonth}|the summer]; [team|the leadership team] [can cover|is ready to cover]", ["{lead} [encouraged|strongly encouraged] it"]),
  ];
  return { key: "leadership", heading: h(ctx, ["How {ceo} is doing", "Founder check-in", "Leadership & bandwidth", "Personal & leadership"]), bullets };
};

// ---------------------------------------------------------------------------
export const operations: Gen = (ctx) => {
  const [o1, o2] = ctx.rng.sample(ctx.profile!.opsTopics, 2);
  const bullets: Bullet[] = [
    bullet(ctx, `${o1[0].toUpperCase() + o1.slice(1)} [is the main operational focus|got a lot of attention this quarter]`, [
      `[Key metric|Main KPI] [improved|moved] from ${ctx.rng.int(55, 70)} to ${ctx.rng.int(71, 92)} [on the internal scorecard|percent]`,
      "[New tooling|A new process] [rolled out|introduced] in [{monthPrev}|the last month]",
    ]),
    bullet(ctx, `${o2[0].toUpperCase() + o2.slice(1)} [still manual|still partly manual]; [automation planned|tooling planned] for {nextQ}`, ["[Currently|Right now] [costs|takes] [the team|ops] [a few|several] hours a week"]),
    bullet(ctx, `[Ops team|Operations team] now ${ctx.rng.int(3, 15)} people across [two|three] [locations|shifts]`, ["[Team leads|Shift leads] [promoted|hired] [internally|from the frontline]"]),
    bullet(ctx, `[Unit cost|Cost] per ${({ fintech: "onboarded customer", climate: "installation", saas: "account", health: "patient", devtools: "account", marketplace: "booking", aiinfra: "customer" } as Record<string, string>)[ctx.cmeta!.industryKey!]} [down|improved] ${ctx.rng.int(5, 22)}% [year on year|since the spring]`, [
      "[Driven by|Thanks to] [automation|better tooling|fewer repeat contacts|bulk purchasing]",
    ]),
    bullet(ctx, "[Quality|Customer complaints] [stable|down] [despite|even with] [higher volumes|seasonal peaks]", ["[Escalations|Complaints] [handled|resolved] [within|in under] " + ctx.rng.int(2, 5) + " working days on average"]),
  ];
  return { key: "operations", heading: h(ctx, ["Operations", "Ops update", "Delivery"]), bullets };
};

// ---------------------------------------------------------------------------
export const infra: Gen = (ctx) => {
  const share = ctx.rng.int(9, 31);
  const bullets: Bullet[] = [
    bullet(ctx, `Cloud spend at ${share}% of revenue[, down from ${share + ctx.rng.int(3, 9)}%|]`, [
      "[Moved|Moving] [batch workloads|inference|CI runners] to [reserved capacity|cheaper instance types] [at Cloudmere|with their cloud provider]",
      "[Target|Goal] is [under|below] " + Math.max(8, share - 6) + "% by [the end of {nextQ}|{nextQ}]",
    ]),
    bullet(ctx, `[Biggest|Largest] cost driver is [GPU time|storage|egress] for [a few|three] large customers`, ["[Pricing|Contract terms] for those customers [to be revisited|up for review] at renewal"]),
    bullet(ctx, `[On-call|Incident] load [manageable|still heavy]: ${ctx.rng.int(2, 9)} pages a week[, mostly from one service|]`, [
      "[Plan|Fix] is [better alerting|a dedicated platform squad|moving to managed services]",
    ]),
  ];
  return { key: "infra", heading: h(ctx, ["Infrastructure costs", "Cloud spend", "Unit costs"]), bullets };
};

export const PORTFOLIO_SECTIONS: Record<string, Gen> = {
  performance, pipeline, product, hiring, fundraising, board, partnerships, customers,
  regulation, pricing, expansion, competition, leadership, operations, infra,
};

/** Which sections a note tends to include, by meeting type and industry. */
export function portfolioSectionWeights(ctx: NoteCtx): [string, number][] {
  const ind = ctx.cmeta!.industryKey!;
  const catchup = ctx.type === "founder_catchup";
  return [
    ["performance", catchup ? 3 : 10], ["pipeline", 6], ["product", 5], ["hiring", ctx.jobs.length ? 7 : 2],
    ["fundraising", ctx.metrics!.runway < 16 ? 7 : 2], ["board", catchup ? 1 : 3], ["partnerships", 3], ["customers", 4],
    ["regulation", ["fintech", "health", "aiinfra"].includes(ind) ? 4 : 1], ["pricing", 2.5], ["expansion", ctx.company!.stage === "series-b" || ctx.company!.stage === "series-c+" ? 4 : 1.5],
    ["competition", 2.5], ["leadership", catchup ? 9 : 1.5], ["operations", ["climate", "marketplace", "health"].includes(ind) ? 4 : 0.8],
    ["infra", ["devtools", "aiinfra"].includes(ind) ? 4 : 0.3],
  ];
}

export { listify, byWhen };
