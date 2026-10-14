/**
 * Company metrics for notes.
 *
 * Every portfolio company gets one deterministic "true" trajectory, so two
 * notes about the same company months apart tell a consistent story:
 * ARR grows at the company's own rate, headcount follows, runway shrinks
 * between fundraises.
 */
import type { CompanyFixture } from "../../fixtures";
import { daysBetween, TODAY } from "../dates";
import { Rng } from "../rng";
import type { CompanyMeta } from "../types";

export interface Metrics {
  arr: number;            // EUR, annualised revenue
  growthQoQ: number;      // %
  nrr: number;            // %
  grossMargin: number;    // %
  burn: number;           // EUR per month
  runway: number;         // months
  headcount: number;
  customers: number;
  newLogos: number;       // this quarter
  churned: number;        // logos this quarter
  largestDeal: number;    // EUR ACV
  pipeline: number;       // EUR weighted
  winRate: number;        // %
  cycleDays: number;
  volume: number;         // industry-specific volume (see IndustryProfile.volume)
  takeRate: number;       // bps (fintech) or % (marketplace)
  planArr: number;        // board plan for this point in time
}

const STAGE_ARR: Record<string, [number, number]> = {
  "pre-seed": [20_000, 160_000], seed: [250_000, 1_200_000], "series-a": [1_500_000, 5_000_000],
  "series-b": [5_500_000, 16_000_000], "series-c+": [18_000_000, 42_000_000],
};
const STAGE_GROWTH: Record<string, [number, number]> = {
  "pre-seed": [30, 60], seed: [18, 40], "series-a": [12, 30], "series-b": [8, 18], "series-c+": [5, 11],
};
const STAGE_HEADCOUNT: Record<string, [number, number]> = {
  "pre-seed": [3, 9], seed: [12, 32], "series-a": [28, 75], "series-b": [70, 160], "series-c+": [180, 320],
};

export function metricsAt(company: CompanyFixture, meta: CompanyMeta, dateIso: string, seed: number): Metrics {
  // One Rng per company, independent of how many notes are written.
  const r = new Rng(seed).fork(`metrics:${meta.slug}`);
  const stage = company.stage!;
  const arrNow = r.int(...STAGE_ARR[stage]);
  const g = r.int(...STAGE_GROWTH[stage]);
  const hcNow = r.int(...STAGE_HEADCOUNT[stage]);
  const runwayNow = r.int(9, 26);
  const nrrBase = r.int(96, 132);
  const gm = { fintech: r.int(55, 78), climate: r.int(22, 42), saas: r.int(72, 86), health: r.int(58, 76), devtools: r.int(70, 85), marketplace: r.int(60, 80), aiinfra: r.int(38, 66) }[meta.industryKey!];
  const acv = { fintech: r.int(4_000, 15_000), climate: r.int(8_000, 60_000), saas: r.int(9_000, 38_000), health: r.int(25_000, 90_000), devtools: r.int(6_000, 30_000), marketplace: r.int(1_500, 6_000), aiinfra: r.int(30_000, 120_000) }[meta.industryKey!];
  const planBias = 1 + (r.float() - 0.55) * 0.3; // some companies ahead of plan, more behind

  const monthsBefore = Math.max(0, daysBetween(dateIso, TODAY) / 30.4);
  const factor = Math.pow(1 + g / 100, -monthsBefore / 3);
  const arr = Math.max(15_000, arrNow * factor);
  const headcount = Math.max(3, Math.round(hcNow * Math.pow(factor, 0.55)));
  // Net burn = people costs (~€8–10k per head per month, fully loaded) minus gross profit.
  const burn = Math.max(40_000, Math.round((headcount * r.int(8_200, 10_500) - (arr / 12) * (gm / 100)) / 1000) * 1000);
  const rj = r.fork(dateIso); // per-note noise; the trajectory above stays fixed
  const jitter = (n: number, spread: number) => n * (1 + (rj.float() - 0.5) * spread);
  const customers = Math.max(2, Math.round(arr / acv));

  const volume = {
    fintech: arr * r.int(60, 140),          // monthly payment volume in EUR
    climate: Math.round(arr / r.int(3_500, 9_000)),
    saas: Math.round(customers * r.int(12, 45)),
    health: Math.round(arr / r.int(300, 900)),
    devtools: Math.round(customers * r.int(18, 60)),
    marketplace: arr * r.int(5, 9) / 12,    // monthly GMV in EUR
    aiinfra: Math.round(arr * r.int(25, 80)),
  }[meta.industryKey!];

  return {
    arr,
    growthQoQ: Math.round(jitter(g, 0.3)),
    nrr: Math.round(jitter(nrrBase, 0.06)),
    grossMargin: gm,
    burn,
    runway: Math.min(30, Math.round(runwayNow + monthsBefore * 0.7)),
    headcount,
    customers,
    newLogos: Math.max(1, Math.round(customers * (g / 100) * jitter(0.9, 0.4))),
    churned: rj.int(0, Math.max(1, Math.round(customers * 0.03))),
    // The largest single contract can never be a silly share of total revenue.
    largestDeal: Math.round(Math.min(jitter(acv * r.int(2, 5), 0.2), arr * 0.18) / 1000) * 1000,
    pipeline: Math.round(arr * jitter(0.45, 0.4) / 10_000) * 10_000,
    winRate: rj.int(18, 38),
    cycleDays: { fintech: r.int(25, 70), climate: r.int(60, 160), saas: r.int(45, 120), health: r.int(120, 270), devtools: r.int(20, 75), marketplace: r.int(7, 30), aiinfra: r.int(40, 110) }[meta.industryKey!],
    volume,
    takeRate: meta.industryKey === "fintech" ? r.int(18, 95) : r.int(9, 22),
    planArr: arr * planBias,
  };
}
