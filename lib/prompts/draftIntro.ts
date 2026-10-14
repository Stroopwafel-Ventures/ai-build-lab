/**
 * Prompt: draft a short double-opt-in intro request, streamed as plain text.
 * Used by /api/ai/draft-intro to show the streaming pattern.
 */
export const DRAFT_INTRO_SYSTEM = `You write short, warm, specific emails for a VC platform team.
Write a double-opt-in intro request from a Stroopwafel Ventures team member to someone they know,
asking whether they'd be open to an introduction. Under 150 words. No subject line. Plain text.`;

export function buildDraftIntroPrompt(opts: {
  connectorName: string;
  strength: number;
  contactName: string;
  contactRole: string;
  reason: string;
}) {
  return `From: ${opts.connectorName} (relationship strength ${opts.strength}/5)
To: ${opts.contactName}, ${opts.contactRole}
Why we want the intro: ${opts.reason}`;
}
