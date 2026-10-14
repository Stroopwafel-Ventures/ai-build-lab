/**
 * Stable UUIDs.
 *
 * Every fixture id is derived from a readable slug ("company:kademint",
 * "contact:portfolio:kademint:0") with a UUID v5-style hash. Same slug in,
 * same UUID out, so regenerating keeps URLs and foreign keys stable.
 */
import { createHash } from "node:crypto";

const NAMESPACE = "stroopwafel-ventures/seed/v1";

export function stableId(slug: string): string {
  const bytes = createHash("sha1").update(`${NAMESPACE}:${slug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** "Café Noir B.V." -> "cafe-noir-b-v" (ASCII, lowercase, dashes). */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/g, "o").replace(/Ø/g, "O").replace(/ß/g, "ss").replace(/æ/g, "ae").replace(/ł/g, "l").replace(/Ł/g, "L")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Email-safe local part: "Zoë van Dijk" -> "zoe.vandijk". */
export function emailLocal(first: string, last: string): string {
  return `${slugify(first).replace(/-/g, "")}.${slugify(last).replace(/-/g, "")}`;
}
