/**
 * Turns sections into a Granola-style markdown body and controls length.
 *
 *   ### Attendees / ### Context / 4–6 topic sections /
 *   ### Asks & opportunities / ### Next steps
 *
 * Length control: every section starts with two bullets (plus any pinned
 * ones), then bullets are added round-robin until the body reaches a
 * per-note target between ~760 and ~1,140 words. That keeps every note in
 * the 700–1,200 word range without padding sentences.
 */
import type { ContactFixture } from "../../fixtures";
import type { NextStep, NoteCtx, Section } from "./context";
import { fullName, userToken } from "./context";
import { countWords } from "./grammar";

export function attendeeLines(ctx: NoteCtx): string[] {
  const contactLine = (c: ContactFixture) => {
    const title = c.current_title ?? "Between roles";
    return c.current_company_name ? `- ${fullName(c)} (${title}, ${c.current_company_name})` : `- ${fullName(c)} (${title})`;
  };
  const userLine = (key: string, title: string) => (title ? `- ${userToken(key)} (${title}, Stroopwafel Ventures)` : `- ${userToken(key)} (Stroopwafel Ventures)`);
  return [...ctx.people.map(contactLine), ...ctx.users.map((u) => userLine(u.key, u.title))];
}

function renderSection(s: Section, take: number): string {
  const lines = [`### ${s.heading}`];
  for (const b of s.bullets.slice(0, take)) {
    lines.push(`- ${b.text}`);
    for (const sub of b.subs) lines.push(`  - ${sub}`);
  }
  return lines.join("\n");
}

function renderSteps(steps: NextStep[]): string {
  return ["### Next steps", ...steps.map((s) => `- [ ] ${s.owner}: ${s.action} (by ${s.by})`)].join("\n");
}

export interface ComposeInput {
  attendees: string[];
  context: string;
  sections: Section[];       // ordered; already chosen for the note
  reserve: Section[];        // extra sections used only if the note is too short
  asks: string[];
  steps: NextStep[];
  targetWords: number;
}

export function compose(input: ComposeInput): { body: string; words: number } {
  const sections = [...input.sections];
  const take = new Map<Section, number>(sections.map((s) => [s, Math.min(s.bullets.length, Math.max(2, s.pinned ?? 0))]));
  const render = () => [
    ["### Attendees", ...input.attendees].join("\n"),
    `### Context\n${input.context}`,
    ...sections.map((s) => renderSection(s, take.get(s)!)),
    ["### Asks & opportunities", ...input.asks.map((a) => `- ${a}`)].join("\n"),
    renderSteps(input.steps),
  ].join("\n\n");

  let body = render();
  // Grow: add bullets round-robin, then whole reserve sections if needed.
  for (;;) {
    if (countWords(body) >= input.targetWords) break;
    const growable = sections.filter((s) => take.get(s)! < s.bullets.length);
    if (growable.length) {
      const s = growable.reduce((a, b) => (take.get(a)! <= take.get(b)! ? a : b));
      take.set(s, take.get(s)! + 1);
    } else if (input.reserve.length && sections.length < 6) {
      const s = input.reserve.shift()!;
      sections.splice(Math.max(2, sections.length - 1), 0, s);
      take.set(s, Math.min(2, s.bullets.length));
    } else break;
    body = render();
  }
  // Shrink: drop unpinned bullets from the longest section while over 1,180 words.
  while (countWords(body) > 1180) {
    const shrinkable = sections.filter((s) => take.get(s)! > Math.max(2, s.pinned ?? 0));
    if (!shrinkable.length) break;
    const s = shrinkable.reduce((a, b) => (take.get(a)! >= take.get(b)! ? a : b));
    take.set(s, take.get(s)! - 1);
    body = render();
  }
  return { body, words: countWords(body) };
}
