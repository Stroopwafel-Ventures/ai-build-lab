/**
 * Prompt: "Who on our team is the best person to introduce us to this contact?"
 *
 * Prompts live in lib/prompts/ so they're easy to find, review and tweak
 * without touching route code. Each file exports:
 *   - a Zod schema for the structured output
 *   - a system prompt
 *   - a function that builds the user prompt from our data
 */
import { z } from "zod";
import { STRENGTH_LABELS, type Contact, type Employment } from "@/lib/types";

export const BestConnectorSchema = z.object({
  summary: z.string().describe("2–3 sentences: who this person is and what they're good for"),
  best_connector_user_id: z.string().nullable().describe("users.id of the best team member to make the intro, or null"),
  reasoning: z.string().describe("Why this connector: strength, overlap, recency. Mention weaker alternatives."),
});
export type BestConnector = z.infer<typeof BestConnectorSchema>;

export const BEST_CONNECTOR_SYSTEM = `You help the platform team at Stroopwafel Ventures, an early-stage VC fund, make warm introductions.
Given a contact, their employment history, and the team members who know them (with relationship strength 1–5, where 5 is very close),
pick the single best team member to make an introduction. Prefer higher strength; break ties by relevance of the team member's role.
If nobody knows the contact, return best_connector_user_id = null and suggest a path via shared former employers in the reasoning.
Only use the information provided. Be concise.`;

export interface KnownBy {
  user_id: string;
  full_name: string;
  title: string | null;
  role: string;
  strength: number;
}

export function buildBestConnectorPrompt(contact: Contact, employment: Employment[], knownBy: KnownBy[]) {
  const jobs = employment
    .map((e) => `- ${e.title ?? "?"} at ${e.company_name} (${e.started_on ?? "?"} → ${e.finished_on ?? "present"})`)
    .join("\n");
  const team = knownBy.length
    ? knownBy
        .map((k) => `- user_id=${k.user_id} | ${k.full_name}, ${k.title ?? k.role} | strength ${k.strength} (${STRENGTH_LABELS[k.strength]})`)
        .join("\n")
    : "(nobody on the team knows this contact directly)";

  return `CONTACT
${contact.first_name} ${contact.last_name}
Headline: ${contact.headline ?? "—"}
Current: ${contact.current_title ?? "—"} at ${contact.current_company_name ?? "—"}
Location: ${contact.location ?? "—"}
Type: ${contact.contact_type}; tags: ${contact.expertise_tags.join(", ") || "—"}
Summary: ${contact.summary ?? "—"}

EMPLOYMENT HISTORY
${jobs || "(none)"}

TEAM MEMBERS WHO KNOW THEM
${team}`;
}

/** What mock mode returns: a simple "highest strength wins" answer. */
export function mockBestConnector(contact: Contact, knownBy: KnownBy[]): BestConnector {
  const best = [...knownBy].sort((a, b) => b.strength - a.strength)[0];
  return {
    summary: `(mock) ${contact.first_name} ${contact.last_name} is ${contact.current_title ?? "a contact"} at ${contact.current_company_name ?? "an unknown company"}.`,
    best_connector_user_id: best?.user_id ?? null,
    reasoning: best
      ? `(mock) ${best.full_name} has the strongest relationship (strength ${best.strength}). Set ANTHROPIC_API_KEY for real reasoning.`
      : "(mock) Nobody knows them directly; look for teammates who share a former employer.",
  };
}
