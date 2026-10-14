import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Badge, Card, EmptyState, PageHeader, Strength, Table, Td, fmtDate, humanize } from "@/components/ui";
import type { User } from "@/lib/types";

export default async function UserPage({ params }: PageProps<"/users/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: user } = await supabase.from("users").select("*").eq("id", id).maybeSingle<User>();
  if (!user) notFound();

  const [{ data: rels }, { data: deals }, { data: notes }] = await Promise.all([
    supabase.from("user_contacts").select("strength, contacts(id, first_name, last_name, current_title, current_company_name, contact_type)").eq("user_id", id).order("strength", { ascending: false }),
    supabase.from("company_deal_team").select("role, companies(id, name, stage, industry)").eq("user_id", id),
    supabase.from("meeting_notes").select("id, title, met_on, meeting_type").eq("created_by", id).order("met_on", { ascending: false }).limit(20),
  ]);

  type Rel = { strength: number; contacts: { id: string; first_name: string; last_name: string; current_title: string | null; current_company_name: string | null; contact_type: string } };
  const contacts = (rels ?? []) as unknown as Rel[];
  const companies = (deals ?? []) as unknown as { role: string; companies: { id: string; name: string; stage: string | null; industry: string | null } }[];

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-3"><Avatar initials={user.avatar_initials} size={44} />{user.full_name}</span>}
        subtitle={<span className="flex items-center gap-2">{user.title}<Badge tone="waffle">{humanize(user.role)}</Badge></span>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={`Knows ${contacts.length} contacts`}>
            {contacts.length === 0 ? <EmptyState art="tulip">No relationships yet.</EmptyState> : (
              <Table head={["Contact", "Role", "Type", "Strength"]}>
                {contacts.map((r) => (
                  <tr key={r.contacts.id}>
                    <Td><Link href={`/contacts/${r.contacts.id}`} className="link">{r.contacts.first_name} {r.contacts.last_name}</Link></Td>
                    <Td className="text-muted">{r.contacts.current_title}{r.contacts.current_company_name && ` at ${r.contacts.current_company_name}`}</Td>
                    <Td>{humanize(r.contacts.contact_type)}</Td>
                    <Td><Strength value={r.strength} /></Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Portfolio work">
            {companies.length === 0 ? <p className="text-sm text-muted">Not on any deal teams.</p> : (
              <ul className="space-y-2 text-sm">
                {companies.map((c) => (
                  <li key={c.companies.id} className="flex items-center justify-between gap-2">
                    <Link href={`/companies/${c.companies.id}`} className="link">{c.companies.name}</Link>
                    <Badge tone={c.role === "lead" ? "tulip" : "neutral"}>{c.role}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Notes written">
            {(notes ?? []).length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
              <ul className="space-y-2 text-sm">
                {(notes ?? []).map((n) => (
                  <li key={n.id}>
                    <Link href={`/notes/${n.id}`} className="link">{n.title}</Link>
                    <div className="text-xs text-muted">{fmtDate(n.met_on)} · {humanize(n.meeting_type)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
