/**
 * npm run seed
 *   1. Upserts participants from seed/participants.local.json (or the example
 *      file) via addParticipant(): users rows, confirmed auth users, logins.
 *   2. Wipes and reloads all app data from seed/data/*.json.
 * Never deletes people or logins (admin-added people survive). Safe to re-run.
 */
import "./_env";
import { createServiceClient } from "@/lib/supabase/service";
import { loadFixtures, upsertParticipants } from "@/lib/seed";
import { participantFile, readParticipants } from "./_participants";

async function main() {
  const db = createServiceClient();
  const file = participantFile();
  const people = readParticipants(file);
  console.log(`👥 Upserting ${people.length} participants from ${file}`);

  const r = await upsertParticipants(db, people, (m) => console.warn(`   ${m}`));
  console.log(`   ✓ ${r.people} people, ${r.newLogins} new login(s)`);

  console.log("🧇 Loading fixtures");
  const report = await loadFixtures(db, (m) => console.log(`   ${m}`));
  console.table(report.counts);
  if (report.skipped.length) console.warn("Skipped:\n  " + report.skipped.join("\n  "));
  console.log("✅ Seed complete.");
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
