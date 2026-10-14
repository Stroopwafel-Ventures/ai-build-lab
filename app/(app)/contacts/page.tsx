import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listContacts } from "@/lib/queries";
import { CONTACT_TYPES } from "@/lib/constants";
import { Badge, EmptyState, ListToolbar, PageHeader, Pagination, Strength, Table, Td, flatParams, humanize } from "@/components/ui";

export const metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const me = await requireUser();
  const params = flatParams(await searchParams);
  const { rows, total } = await listContacts(params, false, me.profile?.id);

  return (
    <>
      <PageHeader title="Contacts" subtitle="Everyone in the network. Fields follow LinkedIn's export format." />
      <ListToolbar
        params={params}
        exportEntity="contacts"
        placeholder="Search names, headlines, companies (e.g. procurement bank)…"
        filters={[
          { name: "type", label: "Any type", options: CONTACT_TYPES.map((t) => ({ value: t, label: humanize(t) })) },
          { name: "known", label: "Known by anyone or no one", options: [{ value: "me", label: "Known by me" }, { value: "anyone", label: "Known by someone" }, { value: "nobody", label: "Known by nobody" }] },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState art="bike">No contacts match those filters.</EmptyState>
      ) : (
        <Table head={["Name", "Current role", "Type", "Location", "Known by", "Best", "You"]}>
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-cream/50">
              <Td><Link href={`/contacts/${c.id}`} className="link font-medium">{c.first_name} {c.last_name}</Link></Td>
              <Td>
                {c.current_title}
                {c.current_company_name && (
                  <span className="text-muted"> at {c.current_company_id ? <Link href={`/companies/${c.current_company_id}`} className="hover:underline">{c.current_company_name}</Link> : c.current_company_name}</span>
                )}
              </Td>
              <Td><Badge>{humanize(c.contact_type)}</Badge></Td>
              <Td className="text-muted">{c.location}</Td>
              <Td className="tabular-nums">{c.known_by_count || <span className="text-muted">0</span>}</Td>
              <Td><Strength value={c.max_strength} /></Td>
              <Td><Strength value={c.my_strength} /></Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination params={params} total={total} />
    </>
  );
}
