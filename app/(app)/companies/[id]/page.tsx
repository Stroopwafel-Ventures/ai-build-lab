import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Badge, Card, EmptyState, Field, PageHeader, fmtDate, humanize } from "@/components/ui";
import type { Company, Employment, Job, User } from "@/lib/types";

export default async function CompanyPage({ params }: PageProps<"/companies/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle<Company>();
  if (!company) notFound();

  const [{ data: team }, { data: jobs }, { data: people }, { data: notes }] = await Promise.all([
    supabase.from("company_deal_team").select("role, users(id, full_name, title, avatar_initials)").eq("company_id", id),
    supabase.from("jobs").select("*").eq("company_id", id).order("status").order("posted_on", { ascending: false }),
    supabase
      .from("contact_employment")
      .select("*, contacts(id, first_name, last_name, current_title, current_company_name)")
      .or(`company_id.eq.${id},company_name.ilike."${company.name.replace(/["\\%_]/g, "")}"`)
      .order("finished_on", { ascending: false, nullsFirst: true }),
    supabase.from("meeting_notes").select("id, title, met_on, meeting_type, summary").eq("company_id", id).order("met_on", { ascending: false }),
  ]);

  const roleOrder = { lead: 0, board: 1, support: 2 } as const;
  const dealTeam = ((team ?? []) as unknown as { role: keyof typeof roleOrder; users: User }[]).sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  type EmpRow = Employment & { contacts: { id: string; first_name: string; last_name: string; current_title: string | null; current_company_name: string | null } };
  const emp = (people ?? []) as EmpRow[];
  const current = emp.filter((e) => !e.finished_on);
  const former = emp.filter((e) => e.finished_on);

  return (
    <>
      <PageHeader
        title={company.name}
        subtitle={<span className="flex flex-wrap items-center gap-2"><Badge tone={company.kind === "portfolio" ? "waffle" : "neutral"}>{humanize(company.kind)}</Badge>{company.industry}{company.stage && <Badge tone="canal">{company.stage}</Badge>}</span>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="About">
            <p className="mb-4">{company.description}</p>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="HQ">{company.hq_location}</Field>
              <Field label="Size">{company.employee_count_range}</Field>
              <Field label="Website">{company.website && <a className="link" href={company.website}>{company.website.replace(/^https?:\/\//, "")}</a>}</Field>
              {company.invested_on && <Field label="Invested">{fmtDate(company.invested_on)}</Field>}
              {company.linkedin_url && <Field label="LinkedIn"><a className="link" href={company.linkedin_url}>Profile</a></Field>}
            </dl>
          </Card>

          {company.kind === "portfolio" && (
            <Card title={`Jobs (${(jobs ?? []).filter((j) => j.status === "open").length} open)`}>
              {(jobs ?? []).length === 0 ? <EmptyState art="tulip">No roles posted.</EmptyState> : (
                <ul className="divide-y divide-line text-sm">
                  {(jobs as Job[]).map((j) => (
                    <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <Link href={`/jobs/${j.id}`} className="link">{j.title}</Link>
                      <span className="flex gap-2 text-xs text-muted">
                        {j.seniority} · {j.location} · {j.remote_policy}
                        {j.status !== "open" && <Badge tone="tulip">{j.status}</Badge>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card title="Meeting notes">
            {(notes ?? []).length === 0 ? <EmptyState art="boat">No notes about this company.</EmptyState> : (
              <ul className="divide-y divide-line text-sm">
                {(notes ?? []).map((n) => (
                  <li key={n.id} className="py-2">
                    <Link href={`/notes/${n.id}`} className="link font-medium">{n.title}</Link>
                    <span className="ml-2 text-xs text-muted">{fmtDate(n.met_on)} · {humanize(n.meeting_type)}</span>
                    {n.summary && <p className="mt-0.5 text-muted">{n.summary}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {dealTeam.length > 0 && (
            <Card title="Deal team">
              <ul className="space-y-2 text-sm">
                {dealTeam.map((t) => (
                  <li key={t.users.id} className="flex items-center gap-2">
                    <Avatar initials={t.users.avatar_initials} />
                    <Link href={`/users/${t.users.id}`} className="link">{t.users.full_name}</Link>
                    <Badge tone={t.role === "lead" ? "tulip" : t.role === "board" ? "canal" : "neutral"}>{t.role}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title={`People here now (${current.length})`}>
            <PeopleList rows={current} />
          </Card>
          <Card title={`Alumni (${former.length})`}>
            <PeopleList rows={former} showDates />
          </Card>
        </div>
      </div>
    </>
  );
}

function PeopleList({ rows, showDates }: { rows: (Employment & { contacts: { id: string; first_name: string; last_name: string } })[]; showDates?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Nobody yet.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((e) => (
        <li key={e.id}>
          <Link href={`/contacts/${e.contacts.id}`} className="link">{e.contacts.first_name} {e.contacts.last_name}</Link>
          <div className="text-xs text-muted">
            {e.title}{showDates && ` · ${e.started_on?.slice(0, 4) ?? "?"}–${e.finished_on?.slice(0, 4) ?? "now"}`}
          </div>
        </li>
      ))}
    </ul>
  );
}
