/**
 * Voyage AI: text embeddings (Anthropic has no embeddings endpoint).
 * Good for: semantic matching, e.g. "find contacts whose background fits
 * this job description". Vectors go in the `embeddings` table (pgvector).
 *
 * Mock mode: with no VOYAGE_API_KEY, returns deterministic pseudo-vectors so
 * code paths run. Mock vectors are NOT semantically meaningful; use
 * Postgres full-text search instead when you don't have a key.
 *
 * No "server-only" import: `npm run embed` uses this from a script too.
 */
export const EMBEDDING_MODEL = "voyage-3.5";
export const EMBEDDING_DIMS = 1024;

export async function embed(
  texts: string[],
  inputType: "document" | "query" = "document",
): Promise<{ vectors: number[][]; mocked: boolean }> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) return { vectors: texts.map(mockVector), mocked: true };

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL, input_type: inputType }),
  });
  if (!res.ok) throw new Error(`Voyage error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { vectors: json.data.map((d: { embedding: number[] }) => d.embedding), mocked: false };
}

function mockVector(text: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  const v = Array.from({ length: EMBEDDING_DIMS }, (_, i) => Math.sin(h + i * 12.9898) % 1);
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}
