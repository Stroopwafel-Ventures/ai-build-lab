/**
 * npm run generate
 *
 * Builds the fictional Stroopwafel Ventures world and writes the committed
 * fixtures in seed/data/*.json plus seed/GOLDEN_SCENARIOS.md.
 *
 * Stages (in order):
 *   companies → team → contacts → employment → relationships → jobs → golden → notes
 *
 * Usage:
 *   npm run generate                      # everything (uses Claude for prose if ANTHROPIC_API_KEY is set)
 *   npm run generate -- --offline         # template prose only, no API calls
 *   npm run generate -- --stage notes     # regenerate one stage, keep the other files as they are
 *
 * The structure (ids, links, counts) is always deterministic: it comes from
 * a seeded PRNG, never from the model. Claude only rewrites prose fields,
 * and every rewrite is validated before it is accepted (lib/generator/enrich.ts).
 *
 * This script never reads seed/participants.local.json.
 */
import { config } from "dotenv";
import { buildWorld, SEED, STAGES, type Stage } from "../lib/generator";

config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { ENRICHERS } from "../lib/generator/enrich";
import { renderGoldenDoc } from "../lib/generator/goldenDoc";
import type { World } from "../lib/generator/types";
import { FIXTURE_FILES, readFixture, writeFixture, writeGoldenDoc, type FixtureFile } from "../lib/generator/write";

const STAGE_FILES: Record<Stage, (FixtureFile | "GOLDEN_SCENARIOS.md")[]> = {
  companies: ["companies.json"],
  team: ["team.json", "company_deal_team.json"],
  contacts: ["contacts.json"],
  employment: ["contact_employment.json"],
  relationships: ["user_contacts.json"],
  jobs: ["jobs.json"],
  golden: ["GOLDEN_SCENARIOS.md"],
  notes: ["meeting_notes.json", "GOLDEN_SCENARIOS.md"],
};

function parseArgs(argv: string[]) {
  const offline = argv.includes("--offline");
  const i = argv.indexOf("--stage");
  const stage = i >= 0 ? (argv[i + 1] as Stage) : null;
  if (stage && !STAGES.includes(stage)) {
    console.error(`Unknown stage "${stage}". Choose one of: ${STAGES.join(", ")}`);
    process.exit(1);
  }
  return { offline, stage };
}

/**
 * When rerunning a single stage, later stages may read prose written by
 * earlier ones (e.g. note enrichment shows Claude the company description).
 * Copy the prose from the files on disk into the fresh world so the stage
 * sees exactly what is committed.
 */
function overlayExistingProse(world: World, except: Stage) {
  const overlay = <T extends { id: string }>(file: FixtureFile, rows: T[], fields: (keyof T)[]) => {
    const existing = readFixture<T>(file);
    if (!existing) return;
    const byId = new Map(existing.map((r) => [r.id, r]));
    let missing = 0;
    for (const r of rows) {
      const e = byId.get(r.id);
      if (!e) { missing++; continue; }
      for (const f of fields) r[f] = e[f];
    }
    if (missing) console.warn(`  ! ${file}: ${missing} ids not found on disk; the files were made by a different generator version. Consider a full run.`);
  };
  if (except !== "companies") overlay("companies.json", world.companies, ["description"]);
  if (except !== "contacts") overlay("contacts.json", world.contacts, ["summary"]);
  if (except !== "jobs") overlay("jobs.json", world.jobs, ["description"]);
}

async function main() {
  const { offline, stage } = parseArgs(process.argv.slice(2));
  const useClaude = !offline && !!process.env.ANTHROPIC_API_KEY;
  console.log(`Building world (seed ${SEED})${stage ? `, stage "${stage}" only` : ""}…`);
  const world = buildWorld(SEED, (m) => console.log(`  ${m}`));

  const stages: Stage[] = stage ? [stage] : [...STAGES];
  if (stage) overlayExistingProse(world, stage);

  if (useClaude) {
    console.log(`Enriching prose with ${process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5"}…`);
    for (const s of stages) {
      const enrich = ENRICHERS[s as keyof typeof ENRICHERS];
      if (enrich) {
        console.log(`- ${s}`);
        await enrich(world, (m) => console.log(m));
      }
    }
  } else {
    console.log(offline ? "Offline: using template prose." : "No ANTHROPIC_API_KEY: using template prose.");
  }

  const files = new Set(stages.flatMap((s) => STAGE_FILES[s]));
  for (const f of files) {
    if (f === "GOLDEN_SCENARIOS.md") writeGoldenDoc(renderGoldenDoc(world));
    else writeFixture(f, FIXTURE_FILES[f](world));
    const rows = f.endsWith(".json") ? ` (${FIXTURE_FILES[f as FixtureFile](world).length} rows)` : "";
    console.log(`  wrote ${f.endsWith(".md") ? "seed/" : "seed/data/"}${f}${rows}`);
  }
  console.log("Done. Run `npm run validate:fixtures` to check the result.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
