/**
 * Bulk add from a text file, one person per line (same formats as the admin
 * paste box):
 *   Jane Doe <jane@x.com>
 *   jane@x.com
 *   Jane Doe, Platform Lead, platform, jane@x.com[, alt@y.com]
 *
 *   npm run add-users -- path/to/list.txt
 */
import "./_env";
import fs from "node:fs";
import { parseBulkLines } from "@/lib/participants";
import { addPersonEverywhere } from "./_addPerson";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run add-users -- path/to/list.txt");
  const lines = parseBulkLines(fs.readFileSync(file, "utf8"));
  for (const l of lines) {
    if (l.error) {
      console.warn(`⚠ skipped "${l.line}": ${l.error}`);
      continue;
    }
    const r = await addPersonEverywhere({ full_name: l.full_name, emails: l.emails, title: l.title ?? undefined, role: l.role });
    console.log(`✓ ${l.full_name} → ${r.key}`);
  }
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
