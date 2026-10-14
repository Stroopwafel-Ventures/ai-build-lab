/**
 * npm run embed — fill the `embeddings` table using Voyage.
 * Optional: without VOYAGE_API_KEY it exits; use Postgres full-text search
 * (the `search` tsvector columns on contacts and meeting_notes) instead.
 *
 * Query example once filled (cosine distance, smaller = closer):
 *   select entity_id, 1 - (vector <=> '[...]') as similarity
 *   from embeddings where entity_type = 'contact'
 *   order by vector <=> '[...]' limit 10;
 */
import "./_env";
import { createServiceClient } from "@/lib/supabase/service";
import { embed } from "@/lib/integrations/voyage";

async function main() {
  if (!process.env.VOYAGE_API_KEY) {
    console.log("No VOYAGE_API_KEY set; skipping embeddings. Full-text search works without them.");
    return;
  }
  const db = createServiceClient();

  const [{ data: contacts }, { data: jobs }, { data: notes }, { data: companies }] = await Promise.all([
    db.from("contacts").select("id, first_name, last_name, headline, summary, current_title, current_company_name, expertise_tags").range(0, 9999),
    db.from("jobs").select("id, title, description").range(0, 9999),
    db.from("meeting_notes").select("id, title, summary, body").range(0, 9999),
    db.from("companies").select("id, name, industry, description").range(0, 9999),
  ]);

  const items = [
    ...(contacts ?? []).map((c) => ({
      entity_type: "contact", entity_id: c.id,
      content: `${c.first_name} ${c.last_name}. ${c.headline ?? ""}. ${c.current_title ?? ""} at ${c.current_company_name ?? ""}. ${c.summary ?? ""} Skills: ${(c.expertise_tags ?? []).join(", ")}`,
    })),
    ...(jobs ?? []).map((j) => ({ entity_type: "job", entity_id: j.id, content: `${j.title}\n${j.description ?? ""}` })),
    ...(notes ?? []).map((n) => ({ entity_type: "meeting_note", entity_id: n.id, content: `${n.title}\n${n.summary ?? ""}\n${n.body ?? ""}`.slice(0, 16000) })),
    ...(companies ?? []).map((c) => ({ entity_type: "company", entity_id: c.id, content: `${c.name} (${c.industry}). ${c.description ?? ""}` })),
  ];

  const BATCH = 64;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const { vectors } = await embed(batch.map((b) => b.content), "document");
    const rows = batch.map((b, k) => ({ ...b, vector: JSON.stringify(vectors[k]) }));
    const { error } = await db.from("embeddings").upsert(rows, { onConflict: "entity_type,entity_id" });
    if (error) throw error;
    console.log(`embedded ${Math.min(i + BATCH, items.length)}/${items.length}`);
  }
}

main().catch((e) => {
  console.error("❌", e.message ?? e);
  process.exit(1);
});
