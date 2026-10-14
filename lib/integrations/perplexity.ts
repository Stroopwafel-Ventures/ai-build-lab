import "server-only";

/**
 * Perplexity: web search with an LLM-written answer and citations.
 * Good for: fresh public info about a COMPANY (recent funding, news, product
 * launches) before a meeting or when qualifying an intro.
 *
 * ⚠️ Returns real-world data. Use it on public company information only.
 * Never write results about real individuals into seed fixtures.
 *
 * Mock mode: with no PERPLEXITY_API_KEY, returns a plausible fake answer.
 */
export interface WebAnswer {
  answer: string;
  citations: string[];
  mocked: boolean;
}

export async function searchWeb(query: string): Promise<WebAnswer> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    return {
      answer: `(mock) Here is what the web says about "${query}": a Series A company that recently announced a partnership and is hiring across engineering and sales.`,
      citations: ["https://news.example/article-1", "https://blog.example/post-2"],
      mocked: true,
    };
  }
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: "Be concise and factual. Cite sources." },
        { role: "user", content: query },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Perplexity error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return {
    answer: json.choices?.[0]?.message?.content ?? "",
    citations: json.citations ?? (json.search_results ?? []).map((r: { url: string }) => r.url),
    mocked: false,
  };
}
