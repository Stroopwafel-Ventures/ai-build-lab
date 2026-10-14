/**
 * The participant list format shared by seed/participants.local.json and the
 * PARTICIPANTS_JSON env var (for deploys where nobody runs `npm run seed`).
 * No "server-only" import: scripts use this too.
 */
import type { UserRole } from "@/lib/fixtures";

export interface ParticipantEntry {
  key: string;
  full_name: string;
  title?: string;
  role?: UserRole | string;
  email?: string;
  emails?: string[];
}

export function emailsOf(p: ParticipantEntry): string[] {
  return [...(p.emails ?? []), ...(p.email ? [p.email] : [])]
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@") && !e.startsWith("replace_with"));
}

/**
 * Participants from the PARTICIPANTS_JSON env var (paste the contents of
 * seed/participants.local.json into Vercel). Returns [] if unset or invalid.
 */
export function participantsFromEnv(): ParticipantEntry[] {
  const raw = process.env.PARTICIPANTS_JSON;
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((p) => p?.key && p?.full_name) : [];
  } catch {
    console.error("PARTICIPANTS_JSON is not valid JSON; ignoring it");
    return [];
  }
}
