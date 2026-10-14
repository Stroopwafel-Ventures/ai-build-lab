/**
 * Reads the participant list: seed/participants.local.json if present
 * (git-ignored, real people), else seed/participants.example.json (fictional).
 */
import fs from "node:fs";
import type { UserRole } from "@/lib/fixtures";

export const LOCAL_FILE = "seed/participants.local.json";
export const EXAMPLE_FILE = "seed/participants.example.json";

export interface ParticipantEntry {
  key: string;
  full_name: string;
  title?: string;
  role?: UserRole | string;
  email?: string;
  emails?: string[];
}

export function participantFile() {
  return fs.existsSync(LOCAL_FILE) ? LOCAL_FILE : EXAMPLE_FILE;
}

export function readParticipants(file = participantFile()): ParticipantEntry[] {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function emailsOf(p: ParticipantEntry): string[] {
  return [...(p.emails ?? []), ...(p.email ? [p.email] : [])]
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@") && !e.startsWith("replace_with"));
}
