/**
 * A tiny template grammar used by the note phrase banks.
 *
 *   "{name}"        -> replaced by vars.name
 *   "[a|b|c]"       -> one option, chosen with the seeded Rng
 *   "[a|[b|c] d]"   -> nesting works (innermost first)
 *
 * Square brackets WITHOUT a pipe are left alone, so markdown checkboxes
 * ("- [ ]") survive.
 */
import type { Rng } from "../rng";

export type Vars = Record<string, string | number>;

const CHOICE = /\[([^[\]]*\|[^[\]]*)\]/;

export function expand(rng: Rng, template: string, vars: Vars = {}): string {
  let s = template.replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in vars)) throw new Error(`template var {${k}} missing in: ${template}`);
    return String(vars[k]);
  });
  let m: RegExpExecArray | null;
  while ((m = CHOICE.exec(s))) {
    s = s.slice(0, m.index) + rng.pick(m[1].split("|")) + s.slice(m.index + m[0].length);
  }
  return s.replace(/ {2,}/g, " ").replace(/ ([,.;:])/g, "$1").trim();
}

/** Euro amounts: 640000 -> "€640k", 1450000 -> "€1.45m" (2 significant decimals max). */
export function money(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `€${v >= 10 ? v.toFixed(1).replace(/\.0$/, "") : v.toFixed(2).replace(/0$/, "").replace(/\.0$/, "")}m`;
  }
  if (n >= 1000) return `€${Math.round(n / 1000)}k`;
  return `€${Math.round(n)}`;
}

export const pct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;

/** 12345 -> "12,345". */
export const num = (n: number) => Math.round(n).toLocaleString("en-GB");

export function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

export function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Lowercase for mid-sentence use, but keep acronyms and labels like "Q3", "B2B SaaS", "AI". */
export function softLower(s: string): string {
  return s.split(" ").map((w) => (/[A-Z].*[A-Z]|\d/.test(w) ? w : w.toLowerCase())).join(" ");
}
