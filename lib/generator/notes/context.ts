/**
 * The context object every section generator receives, plus small helpers
 * for referring to people consistently.
 *
 * Contacts are written by name ("Femke de Wit"). Team members are ALWAYS
 * written as a token ("{{user:p04}}") and swapped for the real name only at
 * seed time, so participant names never reach git.
 */
import type { CompanyFixture, ContactFixture, EmploymentFixture, JobFixture, MeetingType } from "../../fixtures";
import { shortDate } from "../dates";
import type { Rng } from "../rng";
import type { CompanyMeta, TeamMember, World } from "../types";
import type { IndustryProfile } from "./industry";
import type { Metrics } from "./metrics";
import type { NoteNeed } from "../golden";
import { expand, type Vars } from "./grammar";

export interface Bullet {
  text: string;
  subs: string[];
}

export interface Section {
  key: string;
  heading: string;
  bullets: Bullet[];
  /** pinned bullets are never trimmed (planted needs live here) */
  pinned?: number;
}

export interface NextStep {
  owner: string;   // "{{user:p04}}" or a contact's first name
  action: string;
  by: string;      // "24 Oct", "end of month", ...
}

export interface NoteCtx {
  rng: Rng;
  world: World;
  date: string;
  type: MeetingType;
  company: CompanyFixture | null;
  cmeta: CompanyMeta | null;
  profile: IndustryProfile | null;
  metrics: Metrics | null;
  /** contact attendees */
  people: ContactFixture[];
  /** team attendees (keys + roles) */
  users: TeamMember[];
  jobs: JobFixture[];
  golden: NoteNeed | null;
  goldenKey: string | null;
  vars: Vars;
  /** contacts already named in this note (avoid repeating the same person) */
  mentioned: Set<string>;
  /** extra items collected while writing sections */
  asks: string[];
  steps: NextStep[];
  summaryBits: string[];
  /** contacts that must never be name-dropped (golden best/decoy) */
  excluded: Set<string>;
  employmentByContact: Map<string, EmploymentFixture[]>;
}

export const userToken = (key: string) => `{{user:${key}}}`;
export const fullName = (c: ContactFixture) => `${c.first_name} ${c.last_name}`;

/** Expand a template with the note's shared vars plus extras. */
export function t(ctx: NoteCtx, template: string, extra: Vars = {}): string {
  return expand(ctx.rng, template, { ...ctx.vars, ...extra });
}

export function bullet(ctx: NoteCtx, text: string, subs: string[] = [], extra: Vars = {}): Bullet {
  return { text: t(ctx, text, extra), subs: subs.map((s) => t(ctx, s, extra)) };
}

/** A deadline a little after the meeting, phrased like people do. */
export function byWhen(ctx: NoteCtx, minDays = 3, maxDays = 21): string {
  const d = new Date(Date.parse(`${ctx.date}T00:00:00Z`) + ctx.rng.int(minDays, maxDays) * 86400000).toISOString().slice(0, 10);
  return ctx.rng.weighted([[shortDate(d), 6], ["end of month", 1], ["next week", 1], ["the next check-in", 1]] as const);
}

/** Pick a contact matching `filter` who is not excluded or already mentioned. */
export function mentionContact(ctx: NoteCtx, filter: (c: ContactFixture) => boolean): ContactFixture | null {
  const pool = ctx.world.contacts.filter((c) => filter(c) && !ctx.excluded.has(c.id) && !ctx.mentioned.has(c.id) && !ctx.world.contactMeta[c.id].duplicateOf);
  if (!pool.length) return null;
  const c = ctx.rng.pick(pool);
  ctx.mentioned.add(c.id);
  return c;
}

/** The investment-team member leading this note (or the first team attendee). */
export function leadUser(ctx: NoteCtx): string {
  return (ctx.users.find((u) => u.role === "investment") ?? ctx.users[0]).key;
}

/** Any team attendee with one of the given roles, else the note's lead. */
export function userWithRole(ctx: NoteCtx, roles: string[]): string {
  const u = ctx.users.find((x) => roles.includes(x.role));
  return u ? u.key : leadUser(ctx);
}
