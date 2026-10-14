import Link from "next/link";
import { listNotes } from "@/lib/queries";
import { MEETING_TYPES } from "@/lib/constants";
import { Badge, EmptyState, ListToolbar, PageHeader, Pagination, Table, Td, flatParams, fmtDate, humanize } from "@/components/ui";

export const metadata = { title: "Meeting notes" };

export default async function NotesPage({ searchParams }: PageProps<"/notes">) {
  const params = flatParams(await searchParams);
  const { rows, total } = await listNotes(params);

  return (
    <>
      <PageHeader title="Meeting notes" subtitle="Granola-style notes. This is where needs and asks live." />
      <ListToolbar
        params={params}
        exportEntity="notes"
        placeholder='Full-text search, e.g. "intro" procurement'
        filters={[{ name: "type", label: "Any meeting type", options: MEETING_TYPES.map((t) => ({ value: t, label: humanize(t) })) }]}
      />
      {rows.length === 0 ? (
        <EmptyState art="boat">No notes match.</EmptyState>
      ) : (
        <Table head={["Date", "Title", "Type", "Company", "Written by"]}>
          {rows.map((n) => (
            <tr key={n.id} className="hover:bg-cream/50">
              <Td className="whitespace-nowrap text-muted">{fmtDate(n.met_on)}</Td>
              <Td>
                <Link href={`/notes/${n.id}`} className="link font-medium">{n.title}</Link>
                {n.summary && <div className="line-clamp-1 text-xs text-muted">{n.summary}</div>}
              </Td>
              <Td><Badge>{humanize(n.meeting_type)}</Badge></Td>
              <Td>{n.company_id ? <Link href={`/companies/${n.company_id}`} className="hover:underline">{n.company_name}</Link> : "—"}</Td>
              <Td>{n.created_by_name}</Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination params={params} total={total} />
    </>
  );
}
