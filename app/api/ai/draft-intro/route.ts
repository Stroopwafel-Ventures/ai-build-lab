/**
 * POST /api/ai/draft-intro   body: { contact_id, connector_user_id, reason }
 * Streams a draft email as plain text. The streaming twin of /api/ai/example.
 */
import { z } from "zod";
import { guardApi } from "@/lib/apiGuard";
import { createClient } from "@/lib/supabase/server";
import { claudeStream } from "@/lib/integrations/anthropic";
import { DRAFT_INTRO_SYSTEM, buildDraftIntroPrompt } from "@/lib/prompts/draftIntro";

export const maxDuration = 60;

const Body = z.object({
  contact_id: z.string().uuid(),
  connector_user_id: z.string().uuid(),
  reason: z.string().max(1000).default("a portfolio company would value their perspective"),
});

export async function POST(request: Request) {
  const guard = await guardApi("ai:draft-intro", { limit: 30, windowSeconds: 3600 });
  if (guard instanceof Response) return guard;

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "contact_id and connector_user_id are required" }, { status: 400 });
  const { contact_id, connector_user_id, reason } = parsed.data;

  const supabase = await createClient();
  const [{ data: contact }, { data: rel }] = await Promise.all([
    supabase.from("contacts").select("first_name, last_name, current_title, current_company_name").eq("id", contact_id).maybeSingle(),
    supabase.from("user_contacts").select("strength, users(full_name)").eq("contact_id", contact_id).eq("user_id", connector_user_id).maybeSingle(),
  ]);
  if (!contact || !rel) return Response.json({ error: "That team member doesn't know this contact" }, { status: 404 });

  const connectorName = (rel.users as unknown as { full_name: string }).full_name;
  const stream = claudeStream({
    system: DRAFT_INTRO_SYSTEM,
    prompt: buildDraftIntroPrompt({
      connectorName,
      strength: rel.strength,
      contactName: `${contact.first_name} ${contact.last_name}`,
      contactRole: `${contact.current_title ?? ""} at ${contact.current_company_name ?? ""}`,
      reason,
    }),
    mock: `Hi ${contact.first_name}, hope all is well! (mock draft from ${connectorName}) One of our portfolio founders would love 20 minutes of your time: ${reason}. Would you be open to an intro? No pressure at all. Set ANTHROPIC_API_KEY to get a real draft.`,
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
