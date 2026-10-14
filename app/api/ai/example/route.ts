/**
 * POST /api/ai/example   body: { contact_id }
 * → { summary, best_connector_user_id, reasoning, mocked }
 *
 * The template for every AI route:
 *   1. guardApi(): auth + per-user rate limit
 *   2. validate input
 *   3. load data with the user's Supabase client (RLS applies)
 *   4. build the prompt (lib/prompts) and call Claude (lib/integrations)
 *   5. return JSON
 */
import { z } from "zod";
import { guardApi } from "@/lib/apiGuard";
import { createClient } from "@/lib/supabase/server";
import { claudeJson } from "@/lib/integrations/anthropic";
import {
  BEST_CONNECTOR_SYSTEM, BestConnectorSchema, buildBestConnectorPrompt, mockBestConnector, type KnownBy,
} from "@/lib/prompts/bestConnector";
import type { Contact, Employment } from "@/lib/types";

export const maxDuration = 60; // seconds; Claude calls can take a while

const Body = z.object({ contact_id: z.string().uuid() });

export async function POST(request: Request) {
  const guard = await guardApi("ai:example", { limit: 30, windowSeconds: 3600 });
  if (guard instanceof Response) return guard;

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "contact_id (uuid) is required" }, { status: 400 });
  const { contact_id } = parsed.data;

  const supabase = await createClient();
  const [{ data: contact }, { data: employment }, { data: rels }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", contact_id).maybeSingle(),
    supabase.from("contact_employment").select("*").eq("contact_id", contact_id).order("started_on", { ascending: false }),
    supabase.from("user_contacts").select("strength, users(id, full_name, title, role)").eq("contact_id", contact_id),
  ]);
  if (!contact) return Response.json({ error: "Contact not found" }, { status: 404 });

  const knownBy: KnownBy[] = (rels ?? []).map((r) => {
    const u = r.users as unknown as { id: string; full_name: string; title: string | null; role: string };
    return { user_id: u.id, full_name: u.full_name, title: u.title, role: u.role, strength: r.strength };
  });

  try {
    const { data, mocked } = await claudeJson({
      schema: BestConnectorSchema,
      system: BEST_CONNECTOR_SYSTEM,
      prompt: buildBestConnectorPrompt(contact as Contact, (employment ?? []) as Employment[], knownBy),
      mock: mockBestConnector(contact as Contact, knownBy),
    });
    // Guard against a hallucinated id: it must be someone who actually knows them.
    if (data.best_connector_user_id && !knownBy.some((k) => k.user_id === data.best_connector_user_id)) {
      data.best_connector_user_id = null;
    }
    return Response.json({ ...data, mocked });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
