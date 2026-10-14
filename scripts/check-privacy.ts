/**
 * npm run check:privacy — fails if any participant name or email from
 * seed/participants.local.json appears in a file git would commit.
 * Run it before every push. (CI can't run it: the local file isn't in git.)
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { LOCAL_FILE, emailsOf, readParticipants } from "./_participants";

if (!fs.existsSync(LOCAL_FILE)) {
  console.log(`No ${LOCAL_FILE}; nothing to check.`);
  process.exit(0);
}

// 1. The local file itself must be ignored.
try {
  execSync(`git check-ignore -q ${LOCAL_FILE}`);
} catch {
  console.error(`❌ ${LOCAL_FILE} is NOT git-ignored. Fix .gitignore before committing.`);
  process.exit(1);
}

// 2. No names or emails in tracked + staged + untracked-but-not-ignored files.
const people = readParticipants(LOCAL_FILE);
const needles = people.flatMap((p) => [p.full_name, ...emailsOf(p)]).filter((n) => n && n.length > 3);
const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && fs.existsSync(f) && fs.statSync(f).isFile() && !f.endsWith("package-lock.json"));

const hits: string[] = [];
for (const f of files) {
  const text = fs.readFileSync(f, "utf8").toLowerCase();
  for (const n of needles) if (text.includes(n.toLowerCase())) hits.push(`${f}: contains "${n}"`);
}
if (hits.length) {
  console.error("❌ Participant data found in files git would commit:\n  " + hits.join("\n  "));
  process.exit(1);
}
console.log(`✅ Checked ${files.length} files against ${people.length} participants: clean.`);
