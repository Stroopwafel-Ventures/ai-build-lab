/**
 * Reading and writing the committed fixture files in seed/data.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { World } from "./types";

export const DATA_DIR = path.join(process.cwd(), "seed", "data");
export const GOLDEN_DOC = path.join(process.cwd(), "seed", "GOLDEN_SCENARIOS.md");

/** Fixture file -> how to get its rows from the world. Keys are file names. */
export const FIXTURE_FILES = {
  "companies.json": (w: World) => w.companies,
  "team.json": (w: World) => w.team,
  "company_deal_team.json": (w: World) => w.dealTeam,
  "contacts.json": (w: World) => w.contacts,
  "contact_employment.json": (w: World) => w.employment,
  "user_contacts.json": (w: World) => w.userContacts,
  "jobs.json": (w: World) => w.jobs,
  "meeting_notes.json": (w: World) => w.notes,
} as const;
export type FixtureFile = keyof typeof FIXTURE_FILES;

export function writeFixture(file: FixtureFile, rows: unknown) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(path.join(DATA_DIR, file), JSON.stringify(rows, null, 2) + "\n");
}

export function readFixture<T>(file: FixtureFile): T[] | null {
  const p = path.join(DATA_DIR, file);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T[]) : null;
}

export function writeGoldenDoc(markdown: string) {
  writeFileSync(GOLDEN_DOC, markdown.endsWith("\n") ? markdown : markdown + "\n");
}
