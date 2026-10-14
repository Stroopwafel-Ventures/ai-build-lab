/**
 * Needs: the reason the matching workshop exists.
 *
 * Each portfolio note carries 1–3 needs, phrased anywhere from explicit
 * ("intro us to someone at X") to implied ("deals with large retailers keep
 * stalling at procurement"). Implied needs show up only as a topic bullet
 * plus a soft line in "Asks & opportunities", which is what makes them
 * hard (and interesting) to match.
 */
import type { CorpKind } from "../types";
import { CORP_AREAS } from "./industry";
import { bullet, byWhen, leadUser, t, userToken, userWithRole, type Bullet, type NoteCtx } from "./context";

export type Explicitness = "explicit" | "semi" | "implied";

export interface PlannedNeed {
  sectionKey: string;      // which topic section the bullet belongs in
  bullet: Bullet | null;   // topic bullet (always present for implied needs)
  ask: string;             // line for "Asks & opportunities"
  summary: string;         // short phrase for the note summary
}

const CORP_PLURAL: Record<CorpKind, string> = {
  bank: "banks", payments: "payment providers", support_software: "support-software vendors", telco: "telcos",
  energy: "utilities", retail: "retailers", consultancy: "consultancies", insurance: "insurers",
  logistics: "logistics groups", hospital: "hospital groups", cloud: "cloud providers",
};

const REASONS: Record<string, string[]> = {
  fintech: ["for a distribution partnership", "as a design partner for the forecasting module", "to explore a white-label deal"],
  climate: ["for a pilot", "to discuss a white-label offering", "as a launch customer"],
  saas: ["as a design partner", "for a reseller agreement", "as a lighthouse customer"],
  health: ["for a reimbursement pilot", "for a multi-department rollout", "as a clinical partner for the next study"],
  devtools: ["for their startup programme", "for a marketplace listing", "as an enterprise design partner"],
  marketplace: ["for an embedded-insurance partnership", "as a B2B anchor customer", "for a logistics partnership"],
  aiinfra: ["for a marketplace listing", "as a design partner for on-prem deployment", "for committed-spend credits"],
};

/** Corporates that are reserved for golden scenarios: random needs never point there. */
const GOLDEN_CORPS = new Set(["Noordhaven Bank", "Assistora", "Veenstroom Energy", "Huisgoed Retail Group"]);

export function planNeeds(ctx: NoteCtx, count: number): PlannedNeed[] {
  const makers = ctx.rng.shuffle([corporateIntro, hireNeed, advisorNeed, customerNeed, investorNeed, futureTalentNeed]);
  const out: PlannedNeed[] = [];
  for (const make of makers) {
    if (out.length >= count) break;
    const level = ctx.rng.weighted([["explicit", 5], ["semi", 2.5], ["implied", 2.5]] as const);
    const need = make(ctx, level);
    if (need) out.push(need);
  }
  return out;
}

function corporateIntro(ctx: NoteCtx, level: Explicitness): PlannedNeed | null {
  const kinds = ctx.profile!.corpKinds;
  const corps = ctx.world.companies.filter((c) => c.kind === "corporate" && kinds.includes(ctx.world.companyMeta[c.id].corpKind!) && !GOLDEN_CORPS.has(c.name));
  if (!corps.length) return null;
  const corp = ctx.rng.pick(corps);
  const kind = ctx.world.companyMeta[corp.id].corpKind!;
  const area = ctx.rng.pick(CORP_AREAS[kind]);
  const reason = ctx.rng.pick(REASONS[ctx.cmeta!.industryKey!]);
  const owner = userWithRole(ctx, ["partnerships", "platform", "investment"]);
  ctx.steps.push({ owner: userToken(owner), action: t(ctx, `[check who knows|map warm paths into] ${area} at ${corp.name}`), by: byWhen(ctx) });
  if (level === "implied") {
    const stage = ctx.rng.pick(["procurement", "security review", "legal review", "business-case sign-off", "pilot-to-contract conversion"]);
    return {
      sectionKey: "pipeline",
      bullet: bullet(ctx, `Deals with [large|bigger] ${CORP_PLURAL[kind]} [keep stalling|tend to stall|have stalled twice now] at ${stage}`, [
        `[Happened twice this quarter|Third time this year], most recently with ${corp.name}`,
        `{ceo} thinks they are [talking to the wrong level|missing an internal sponsor|pitching the wrong business case]`,
      ]),
      ask: t(ctx, `[Implied|Not an explicit ask]: they lack a relationship with decision makers at ${CORP_PLURAL[kind]} like ${corp.name}; [an insider view|someone who knows how they buy] would help.`),
      summary: `deals with ${CORP_PLURAL[kind]} stalling at ${stage}`,
    };
  }
  return {
    sectionKey: "partnerships",
    bullet: level === "semi" ? bullet(ctx, `[Keen|Eager] to get in front of ${corp.name} ${reason}`, [`No relationship there yet; [cold outreach|the inbound form] went nowhere`]) : null,
    ask: level === "explicit"
      ? t(ctx, `[Explicit ask|Asked directly]: intro to someone in ${area} at ${corp.name} ${reason}.`)
      : t(ctx, `Would value a conversation with someone at ${corp.name} (${area}), ${reason}.`),
    summary: `intro to ${corp.name}`,
  };
}

function hireNeed(ctx: NoteCtx, level: Explicitness): PlannedNeed | null {
  const open = ctx.jobs.filter((j) => j.status === "open" && j.posted_on <= ctx.date);
  if (!open.length) return null;
  const job = ctx.rng.pick(open);
  ctx.steps.push({ owner: userToken(userWithRole(ctx, ["talent"])), action: t(ctx, `share [two or three|a few] profiles for the ${job.title} role`), by: byWhen(ctx) });
  if (level === "implied") {
    return {
      sectionKey: "hiring",
      bullet: bullet(ctx, `{ceo} is still covering [a lot of|most of] the ${job.department === "exec" ? "leadership" : job.department} work personally while the ${job.title} seat is open`, [`[It is showing up in|It is affecting] [response times|the roadmap|pipeline coverage]`]),
      ask: t(ctx, `[Implied|Not asked directly]: the open ${job.title} seat is costing founder time; strong names would be welcome even without a formal ask.`),
      summary: `${job.title} gap`,
    };
  }
  return {
    sectionKey: "hiring",
    bullet: null,
    ask: level === "explicit" ? t(ctx, `Referrals for the ${job.title} role ([${job.location}|based in ${job.location}]).`) : t(ctx, `The ${job.title} search is the main hiring risk; [any strong names welcome|happy to see any strong names].`),
    summary: `hiring a ${job.title}`,
  };
}

function advisorNeed(ctx: NoteCtx, level: Explicitness): PlannedNeed | null {
  const ind = ctx.cmeta!.industryKey!;
  const options: [string, string, string][] = [
    ["pricing", "someone who has moved a B2B product to usage-based pricing", "Pricing is still set by gut feel; [three|four] different discount levels in the last five deals"],
    ["board", `an independent board member with ${ctx.vars.industry} scale-up experience`, "Board discussions keep drifting into operational detail; nobody around the table has scaled a company like this"],
    ["sales", "a sales leader who has built a first enterprise team", "Founder-led sales is hitting its limit; enterprise deals keep getting stuck after the first demo"],
    ...(ind === "fintech" ? [["regulation", "an advisor who has taken a company through an e-money licence", "The licence application has been 'two months away' for [two|three] quarters"] as [string, string, string]] : []),
    ...(ind === "health" ? [["regulation", "someone who has been through MDR class IIa certification", "Notified-body questions are piling up and nobody in-house has done this before"] as [string, string, string]] : []),
    ...(ind === "aiinfra" ? [["regulation", "an EU AI Act specialist", "Enterprise customers increasingly ask about AI Act obligations and the team improvises the answers"] as [string, string, string]] : []),
    ...(ind === "climate" ? [["regulation", "someone who knows balancing-market prequalification", "Prequalification paperwork keeps bouncing back from the grid operator"] as [string, string, string]] : []),
    ["expansion", `someone who has opened a US office for a European ${ctx.vars.industry} company`, "A third of inbound now comes from the US, but nobody has a plan for it"],
  ];
  const [section, who, symptom] = ctx.rng.pick(options);
  const sectionKey = section === "regulation" ? "regulation" : section === "board" ? "board" : section === "pricing" ? "pricing" : section === "expansion" ? "expansion" : "pipeline";
  ctx.steps.push({ owner: userToken(userWithRole(ctx, ["platform", "community", "operations"])), action: `[suggest|line up] ${ctx.rng.pick(["two", "a couple of", "one or two"])} advisor options (${section})`, by: byWhen(ctx, 7, 28) });
  if (level === "implied") {
    return {
      sectionKey,
      bullet: bullet(ctx, symptom, [`[{ceo} acknowledged it|{ceo} raised it] but has no [plan|owner] for it yet`]),
      ask: t(ctx, `[Implied|No explicit ask]: would benefit from ${who}.`),
      summary: `${section} support`,
    };
  }
  return {
    sectionKey,
    bullet: level === "semi" ? bullet(ctx, symptom, []) : null,
    ask: level === "explicit" ? t(ctx, `Looking for ${who}[ as an advisor| for a few hours a month|, ideally as an advisor with a small equity stake].`) : t(ctx, `Open to ${who} if we know a good one.`),
    summary: `looking for ${who}`,
  };
}

function customerNeed(ctx: NoteCtx, level: Explicitness): PlannedNeed | null {
  const market = ctx.rng.pick(ctx.profile!.markets);
  const buyer = ctx.rng.pick(ctx.profile!.buyers);
  ctx.steps.push({ owner: userToken(leadUser(ctx)), action: `[ask around the portfolio|check the network] for ${buyer} in ${market}`, by: byWhen(ctx) });
  if (level === "implied") {
    return {
      sectionKey: "pipeline",
      bullet: bullet(ctx, `Pipeline in ${market} is thin: [{n} qualified opportunities|only a handful of qualified opportunities] despite [the launch|two months of outbound]`, [`Response rates from ${buyer} there [well below|about half of] the Dutch numbers`], { n: ctx.rng.int(2, 5) }),
      ask: t(ctx, `[Implied|Not asked]: warm introductions to ${buyer} in ${market} would [unblock|accelerate] the launch.`),
      summary: `thin pipeline in ${market}`,
    };
  }
  return {
    sectionKey: "pipeline",
    bullet: null,
    ask: t(ctx, `${level === "explicit" ? "Intros" : "Any intros"} to ${buyer} in ${market}[ for customer discovery| as potential design partners| for the next sales push].`),
    summary: `customer intros in ${market}`,
  };
}

function investorNeed(ctx: NoteCtx, level: Explicitness): PlannedNeed | null {
  if (!ctx.metrics || ctx.metrics.runway > 15 || ctx.company?.stage === "series-c+") return null;
  const next = ctx.vars.nextRound as string;
  ctx.steps.push({ owner: userToken(leadUser(ctx)), action: `draft a target investor list for the ${next}`, by: byWhen(ctx, 7, 21) });
  return {
    sectionKey: "fundraising",
    bullet: level === "implied" ? bullet(ctx, `Runway of {runway} months and no [investor conversations|relationships with ${next} investors] started yet`, []) : null,
    ask: level === "implied"
      ? t(ctx, `[Implied|Not asked yet]: they will need ${next} investor relationships soon.`)
      : t(ctx, `${level === "explicit" ? "Intros" : "Early intros"} to ${next} investors focused on ${ctx.vars.industry}.`),
    summary: `${next} investor intros`,
  };
}

function futureTalentNeed(ctx: NoteCtx, level: Explicitness): PlannedNeed | null {
  const roles = ["first Head of People", "Head of Finance", "country lead for Germany", "Head of Partnerships", "senior product designer", "Head of Customer Success"];
  const role = ctx.rng.pick(roles);
  if (ctx.jobs.some((j) => role.toLowerCase().includes(j.title.toLowerCase()))) return null;
  return {
    sectionKey: "hiring",
    bullet: level === "implied" ? bullet(ctx, `[Nobody owns|No one really owns] ${role.replace(/^(first |senior )/, "").toLowerCase()} topics yet; {ceo} is [patching it|handling it ad hoc]`, []) : null,
    ask: level === "implied" ? t(ctx, `[Implied|Not asked]: a ${role} will be needed within [two|three] quarters.`) : t(ctx, `Will need a ${role} [in {nextQ}|early next year]; early names welcome.`),
    summary: `future ${role} hire`,
  };
}
