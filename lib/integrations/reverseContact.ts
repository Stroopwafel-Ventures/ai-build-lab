import "server-only";

/**
 * Reverse Contact: turn an email address into a public professional profile
 * (name, headline, current company, LinkedIn URL).
 * Good for: enriching a contact a participant has knowingly added.
 *
 * ⚠️ Returns data about REAL people. Only use it on contacts participants
 * have provided themselves, and never write results into seed fixtures.
 * Check https://docs.reversecontact.com for the current endpoint/params.
 *
 * Mock mode: with no REVERSE_CONTACT_API_KEY, returns a fictional profile.
 */
export interface PersonProfile {
  email: string;
  full_name: string | null;
  headline: string | null;
  company: string | null;
  location: string | null;
  linkedin_url: string | null;
  mocked: boolean;
}

export async function enrichEmail(email: string): Promise<PersonProfile> {
  const key = process.env.REVERSE_CONTACT_API_KEY;
  if (!key) {
    return {
      email,
      full_name: "Femke de Vries (mock)",
      headline: "Head of Partnerships at Grachtenbank (fictional)",
      company: "Grachtenbank",
      location: "Amsterdam, Netherlands",
      linkedin_url: "https://www.linkedin.com/in/fictional-femke-de-vries",
      mocked: true,
    };
  }
  const url = new URL("https://api.reversecontact.com/enrichment");
  url.searchParams.set("apikey", key);
  url.searchParams.set("email", email);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Reverse Contact error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const person = json.person ?? {};
  const position = person.positions?.positionHistory?.[0] ?? {};
  return {
    email,
    full_name: [person.firstName, person.lastName].filter(Boolean).join(" ") || null,
    headline: person.headline ?? null,
    company: position.companyName ?? null,
    location: person.location ?? null,
    linkedin_url: person.linkedInUrl ?? null,
    mocked: false,
  };
}
