import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { isMock } from "@/lib/integrations/anthropic";
import { AiExampleClient } from "./AiExampleClient";

export const metadata = { title: "AI example" };

export default async function AiExamplePage({ searchParams }: PageProps<"/ai-example">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, current_title, current_company_name")
    .order("last_name")
    .range(0, 999);

  return (
    <>
      <PageHeader
        title="AI example: who should make the intro?"
        subtitle="Pick a contact. The route loads their history and relationships, asks Claude, and returns structured JSON."
      />
      {isMock() && (
        <p className="mb-4 rounded-xl border border-tulip/40 bg-tulip/10 p-3 text-sm">
          Mock mode: no <code>ANTHROPIC_API_KEY</code> is set, so answers are canned. Everything else works the same.
        </p>
      )}
      <AiExampleClient
        contacts={(contacts ?? []).map((c) => ({ id: c.id, label: `${c.first_name} ${c.last_name} · ${c.current_title ?? ""}${c.current_company_name ? ` at ${c.current_company_name}` : ""}` }))}
        initialContactId={typeof sp.contact_id === "string" ? sp.contact_id : ""}
      />
    </>
  );
}
