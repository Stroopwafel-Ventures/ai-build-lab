/**
 * Reads the participant list: seed/participants.local.json if present
 * (git-ignored, real people), else seed/participants.example.json (fictional).
 */
import fs from "node:fs";
import { emailsOf, type ParticipantEntry } from "@/lib/participantList";

export { emailsOf, type ParticipantEntry };

export const LOCAL_FILE = "seed/participants.local.json";
export const EXAMPLE_FILE = "seed/participants.example.json";

export function participantFile() {
  return fs.existsSync(LOCAL_FILE) ? LOCAL_FILE : EXAMPLE_FILE;
}

export function readParticipants(file = participantFile()): ParticipantEntry[] {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

