/**
 * Date helpers. The world is frozen at TODAY so fixtures never drift.
 * Employment dates are month-precise (LinkedIn exports only give months),
 * so careers are modelled as "month numbers" = year * 12 + (month - 1).
 */
export const TODAY = "2026-10-14";
const TODAY_DATE = new Date(`${TODAY}T00:00:00Z`);

export const TODAY_MONTH = monthOf(TODAY);

/** "2021-03-17" -> month number. */
export function monthOf(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return y * 12 + (m - 1);
}

/** month number -> "2021-03-01". */
export function monthToIso(month: number): string {
  const y = Math.floor(month / 12);
  const m = (month % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/** ISO date `days` before TODAY. */
export function daysAgo(days: number): string {
  const d = new Date(TODAY_DATE.getTime() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Whole days between two ISO dates (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

/** "2026-11-03" -> "3 Nov". */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** "2026-11-03" -> "November". */
export function monthName(iso: string): string {
  return MONTHS[Number(iso.split("-")[1]) - 1];
}

/** "2026-08-01" -> "Q3 2026". */
export function quarterOf(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
}

/** The quarter before the one containing `iso`, e.g. "Q2". */
export function previousQuarterLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const q = Math.floor((m - 1) / 3) + 1;
  return q === 1 ? `Q4 ${y - 1}` : `Q${q - 1}`;
}

/** Year of a month number. */
export function yearOfMonth(month: number): number {
  return Math.floor(month / 12);
}
