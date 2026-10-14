import Link from "next/link";
import { listJobs } from "@/lib/queries";
import { DEPARTMENTS, EMPLOYMENT_TYPES, REMOTE, SENIORITIES } from "@/lib/constants";
import { Badge, EmptyState, ListToolbar, PageHeader, Pagination, Table, Td, flatParams, fmtDate } from "@/components/ui";

export const metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const params = flatParams(await searchParams);
  const { rows, total } = await listJobs(params);

  return (
    <>
      <PageHeader title="Jobs" subtitle="Roles across the portfolio. Shows open roles unless you pick another status." />
      <ListToolbar
        params={params}
        exportEntity="jobs"
        placeholder="Search title, description, location…"
        filters={[
          { name: "department", label: "Any department", options: [...DEPARTMENTS] },
          { name: "seniority", label: "Any seniority", options: [...SENIORITIES] },
          { name: "remote_policy", label: "Any remote policy", options: [...REMOTE] },
          { name: "employment_type", label: "Any type", options: [...EMPLOYMENT_TYPES] },
          { name: "status", label: "Open", options: ["paused", "filled"] },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState art="tulip">No jobs match those filters.</EmptyState>
      ) : (
        <Table head={["Title", "Company", "Department", "Seniority", "Location", "Type", "Posted"]}>
          {rows.map((j) => (
            <tr key={j.id} className="hover:bg-cream/50">
              <Td><Link href={`/jobs/${j.id}`} className="link font-medium">{j.title}</Link></Td>
              <Td><Link href={`/companies/${j.company_id}`} className="hover:underline">{j.company_name}</Link></Td>
              <Td>{j.department}</Td>
              <Td>{j.seniority}</Td>
              <Td>{j.location} <span className="text-xs text-muted">· {j.remote_policy}</span></Td>
              <Td>{j.employment_type !== "full-time" ? <Badge tone="canal">{j.employment_type}</Badge> : j.employment_type}</Td>
              <Td>{fmtDate(j.posted_on)}</Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination params={params} total={total} />
    </>
  );
}
