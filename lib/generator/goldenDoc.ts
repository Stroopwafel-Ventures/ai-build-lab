/**
 * Renders seed/GOLDEN_SCENARIOS.md from the planted scenarios.
 * Team members appear only as keys (p08, i01), never names.
 */
import { roleAt } from "./employment";
import type { World } from "./types";

export function renderGoldenDoc(world: World): string {
  const contact = (id: string) => world.contacts.find((c) => c.id === id)!;
  const company = (id: string) => world.companies.find((c) => c.id === id)!;
  const note = (id: string | null) => (id ? world.notes.find((n) => n.id === id) : undefined);
  const job = (id: string | null) => (id ? world.jobs.find((j) => j.id === id) : undefined);
  const name = (id: string) => `${contact(id).first_name} ${contact(id).last_name}`;

  const lines: string[] = [
    "# Golden scenarios",
    "",
    "Planted matches for testing matching and warm-introduction features. Each scenario has a **need**",
    "(an open job or a need written into a meeting note), the **best-fit contact** with a strong warm path",
    "(strength 4–5), and a **decoy** that matches on keywords but is a worse fit and only weakly reachable",
    "(strength 1–2, or only via someone they used to work with).",
    "",
    "All people and companies are fictional. Team members are referred to by key only (`p08`, `i01`);",
    "their names live in `seed/participants.local.json`, which is never committed.",
    "",
    "`npm run validate:fixtures` checks that every path below still holds.",
    "",
    "| # | Need | Company | Best fit | Warm path | Decoy | Decoy path |",
    "|---|------|---------|----------|-----------|-------|------------|",
  ];
  for (const g of world.golden) {
    const decoyPath = "userKey" in g.decoyPath ? `${g.decoyPath.userKey} @ ${g.decoyPath.strength}` : `overlap only (${g.decoyPath.company})`;
    lines.push(`| ${g.key} | ${g.needKind === "job" ? "open job" : "meeting note"} | ${company(g.companyId).name} | ${name(g.bestContactId)} | ${g.warmPath.userKey} @ ${g.warmPath.strength} | ${name(g.decoyContactId)} | ${decoyPath} |`);
  }
  lines.push("");

  for (const g of world.golden) {
    const best = contact(g.bestContactId);
    const decoy = contact(g.decoyContactId);
    const n = note(g.noteId);
    const j = job(g.jobId);
    lines.push(`## ${g.key}. ${g.title}`, "");
    lines.push(`**Need.** ${g.needSummary}`, "");
    if (j) lines.push(`- Job: **${j.title}** at ${company(j.company_id).name} — \`jobs.id = ${j.id}\` (status \`${j.status}\`, posted ${j.posted_on})`);
    if (n) lines.push(`- Meeting note: **${n.title}** (${n.met_on}, \`${n.meeting_type}\`) — \`meeting_notes.id = ${n.id}\``);
    if (n) lines.push(`- Planted in the note: ${g.noteNeedText.map((t) => `“${t}”`).join("; ")}`);
    lines.push("");
    lines.push(`**Best fit:** ${best.first_name} ${best.last_name}, ${roleAt(best.current_title ?? "", best.current_company_name)} — \`contacts.id = ${best.id}\``, "");
    lines.push(`- Why: ${g.bestWhy}`);
    lines.push(`- Warm path: **${g.warmPath.userKey}** knows them at strength **${g.warmPath.strength}**.`, "");
    lines.push(`**Decoy:** ${decoy.first_name} ${decoy.last_name}, ${roleAt(decoy.current_title ?? "", decoy.current_company_name)} — \`contacts.id = ${decoy.id}\``, "");
    lines.push(`- Why it's worse: ${g.decoyWhy}`);
    if ("userKey" in g.decoyPath) {
      lines.push(`- Decoy path: **${g.decoyPath.userKey}** at strength **${g.decoyPath.strength}** (no other team member knows them).`);
    } else {
      lines.push(`- Decoy path: nobody on the team knows them directly. Reachable only through employment overlap at ${g.decoyPath.company} with ${name(g.decoyPath.overlapVia)} (who **${g.warmPath.userKey}** knows at ${g.warmPath.strength}).`);
    }
    lines.push("", "**How a matcher could find it:**", "", "```sql", `-- ${g.queryHint}`, "```", "");
  }
  return lines.join("\n");
}
