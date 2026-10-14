import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ReseedButton } from "./ReseedButton";

export const metadata = { title: "Admin" };
export const maxDuration = 300; // re-seeding inserts a few thousand rows

const INTEGRATIONS = [
  ["ANTHROPIC_API_KEY", "Claude"],
  ["PERPLEXITY_API_KEY", "Perplexity"],
  ["REVERSE_CONTACT_API_KEY", "Reverse Contact"],
  ["HARMONIC_API_KEY", "Harmonic"],
  ["VOYAGE_API_KEY", "Voyage embeddings"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase service role"],
] as const;

export default async function AdminPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Admin" subtitle="Housekeeping for the build session." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Reset the data">
          <p className="mb-4 text-sm text-muted">
            Wipes companies, contacts, jobs, relationships and notes, then reloads the committed fixtures.
            People and logins are never deleted. Same as <code>npm run seed</code>, minus the participant upsert.
          </p>
          <ReseedButton />
        </Card>
        <Card title="Integrations">
          <ul className="space-y-1 text-sm">
            {INTEGRATIONS.map(([key, label]) => (
              <li key={key} className="flex justify-between">
                <span>{label}</span>
                <span className={process.env[key] ? "text-canal" : "text-muted"}>{process.env[key] ? "configured" : "mock mode"}</span>
              </li>
            ))}
          </ul>
          <Link href="/admin/people" className="link mt-4 block text-sm">Manage people & logins →</Link>
        </Card>
      </div>
    </>
  );
}
