import "server-only";

/**
 * Harmonic: company data (headcount, funding, investors, growth signals).
 * Good for: sizing a target company, finding who invested in it, spotting
 * fast-growing companies to approach for partnerships.
 *
 * ⚠️ Returns real-world data. Use on public company info only; never write
 * results into seed fixtures. Check https://docs.harmonic.ai for details.
 *
 * Mock mode: with no HARMONIC_API_KEY, returns a fictional company.
 */
export interface CompanyProfile {
  name: string;
  domain: string;
  headcount: number | null;
  funding_total_usd: number | null;
  last_round: string | null;
  investors: string[];
  description: string | null;
  mocked: boolean;
}

export async function lookupCompany(domain: string): Promise<CompanyProfile> {
  const key = process.env.HARMONIC_API_KEY;
  if (!key) {
    return {
      name: "Polderpay (mock)",
      domain,
      headcount: 84,
      funding_total_usd: 23_500_000,
      last_round: "Series A",
      investors: ["Stroopwafel Ventures", "Dijkstra Capital"],
      description: "Fictional payments infrastructure for Dutch SMEs.",
      mocked: true,
    };
  }
  const url = new URL("https://api.harmonic.ai/companies");
  url.searchParams.set("website_domain", domain);
  const res = await fetch(url, { method: "POST", headers: { apikey: key } });
  if (!res.ok) throw new Error(`Harmonic error ${res.status}: ${await res.text()}`);
  const c = await res.json();
  return {
    name: c.name ?? domain,
    domain,
    headcount: c.headcount ?? null,
    funding_total_usd: c.funding?.funding_total ?? null,
    last_round: c.funding?.last_funding_type ?? null,
    investors: (c.funding?.investors ?? []).map((i: { name: string }) => i.name),
    description: c.description ?? null,
    mocked: false,
  };
}
