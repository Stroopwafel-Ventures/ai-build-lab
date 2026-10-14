import Link from "next/link";
import { listCompanies } from "@/lib/queries";
import { COMPANY_KINDS, STAGES } from "@/lib/constants";
import { Badge, EmptyState, ListToolbar, PageHeader, Pagination, Table, Td, flatParams, fmtDate, humanize } from "@/components/ui";

export const metadata = { title: "Companies" };

export default async function CompaniesPage({ searchParams }: PageProps<"/companies">) {
  const params = flatParams(await searchParams);
  const { rows, total } = await listCompanies(params);

  return (
    <>
      <PageHeader title="Companies" subtitle="Portfolio companies and every organisation our contacts have worked at." />
      <ListToolbar
        params={params}
        exportEntity="companies"
        placeholder="Search name, industry, description…"
        filters={[
          { name: "kind", label: "Any kind", options: [...COMPANY_KINDS] },
          { name: "stage", label: "Any stage", options: [...STAGES] },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState art="bike">No companies match those filters.</EmptyState>
      ) : (
        <Table head={["Name", "Kind", "Industry", "Stage", "HQ", "Size", "Open jobs", "Invested"]}>
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-cream/50">
              <Td><Link href={`/companies/${c.id}`} className="link font-medium">{c.name}</Link></Td>
              <Td><Badge tone={c.kind === "portfolio" ? "waffle" : "neutral"}>{humanize(c.kind)}</Badge></Td>
              <Td>{c.industry}</Td>
              <Td>{c.stage ?? "—"}</Td>
              <Td>{c.hq_location}</Td>
              <Td>{c.employee_count_range}</Td>
              <Td className="tabular-nums">{c.kind === "portfolio" ? c.job_count : "—"}</Td>
              <Td>{c.invested_on ? fmtDate(c.invested_on) : "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination params={params} total={total} />
    </>
  );
}
