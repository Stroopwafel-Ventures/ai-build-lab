/**
 * npm run seed
 *   1. Upserts participants from seed/participants.local.json (or the example
 *      file) via addParticipant(): users rows, confirmed auth users, logins.
 *   2. Wipes and reloads all app data from seed/data/*.json.
 * Never deletes people or logins (admin-added people survive). Safe to re-run.
 */
import "./_env";
import { createServiceClient } from "@/lib/supabase/service";
import { addParticipant } from "@/lib/participants";
import { loadFixtures } from "@/lib/seed";
import { emailsOf, participantFile, readParticipants } from "./_participants";

async function main() {
  const db = createServiceClient();
  const file = participantFile();
  const people = readParticipants(file);
  console.log(`👥 Upserting ${people.length} participants from ${file}`);

  for (const p of people) {
    const emails = emailsOf(p);
    if (!emails.length) console.warn(`   ⚠ ${p.key} has no usable email yet; they can't sign in until one is added`);
    const r = await addParticipant(db, {
      key: p.key, full_name: p.full_name, title: p.title, role: p.role, emails, source: "seed",
    });
    r.warnings.forEach((w) => console.warn(`   ⚠ ${p.key}: ${w}`));
    if (r.emailsAdded.length) console.log(`   ✓ ${p.key}: linked ${r.emailsAdded.length} new login(s)`);
  }

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
