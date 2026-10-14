import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Badge, Card, EmptyState, Field, PageHeader, Strength, fmtDate, humanize } from "@/components/ui";
import type { Contact, Employment, User } from "@/lib/types";

export default async function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle<Contact>();
  if (!contact) notFound();

  const [{ data: employment }, { data: rels }, { data: noteLinks }] = await Promise.all([
    supabase.from("contact_employment").select("*").eq("contact_id", id).order("started_on", { ascending: false, nullsFirst: false }),
    supabase.from("user_contacts").select("strength, users(id, full_name, title, role, avatar_initials)").eq("contact_id", id).order("strength", { ascending: false }),
    supabase.from("meeting_note_contacts").select("meeting_notes(id, title, met_on, meeting_type)").eq("contact_id", id),
  ]);

  const jobs = (employment ?? []) as Employment[];
  const knownBy = (rels ?? []) as unknown as { strength: number; users: User }[];
  const notes = ((noteLinks ?? []) as unknown as { meeting_notes: { id: string; title: string; met_on: string; meeting_type: string } }[])
    .map((n) => n.meeting_notes)
    .sort((a, b) => b.met_on.localeCompare(a.met_on));

  // Former colleagues: other contacts with overlapping time at the same company.
  // A simple version of the "backchannel" path matching teams will build on.
  const companyIds = [...new Set(jobs.map((j) => j.company_id).filter(Boolean))] as string[];
  const { data: overlapRows } = companyIds.length
    ? await supabase
        .from("contact_employment")
        .select("contact_id, company_id, company_name, started_on, finished_on, contacts(id, first_name, last_name, user_contacts(strength))")
        .in("company_id", companyIds)
        .neq("contact_id", id)
    : { data: [] };
  const overlaps = (overlapRows ?? []).filter((o) =>
    jobs.some((j) => j.company_id === o.company_id && overlapsInTime(j, o as unknown as Employment)),
  ) as unknown as (Employment & { contacts: { id: string; first_name: string; last_name: string; user_contacts: { strength: number }[] } })[];

  return (
    <>
      <PageHeader
        title={`${contact.first_name} ${contact.last_name}`}
        subtitle={<span className="flex flex-wrap items-center gap-2">{contact.headline}<Badge>{humanize(contact.contact_type)}</Badge></span>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Profile">
            {contact.summary && <p className="mb-4">{contact.summary}</p>}
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Current role">
                {contact.current_title}
                {contact.current_company_name && <> at {contact.current_company_id ? <Link className="link" href={`/companies/${contact.current_company_id}`}>{contact.current_company_name}</Link> : contact.current_company_name}</>}
              </Field>
              <Field label="Location">{contact.location}</Field>
              <Field label="Email">{contact.email}</Field>
              <Field label="LinkedIn">{contact.linkedin_url && <a className="link" href={contact.linkedin_url}>Profile</a>}</Field>
              <Field label="Source">{contact.source}</Field>
            </dl>
            {contact.expertise_tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {contact.expertise_tags.map((t) => <Badge key={t} tone="waffle">{t}</Badge>)}
              </div>
            )}
          </Card>

          <Card title="Employment history">
            {jobs.length === 0 ? <p className="text-sm text-muted">No positions recorded.</p> : (
              <ol className="relative ml-2 border-l-2 border-line">
                {jobs.map((j) => (
                  <li key={j.id} className="mb-5 ml-4 last:mb-0">
                    <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ${j.finished_on ? "bg-line" : "bg-tulip"}`} />
                    <div className="font-medium">{j.title}</div>
                    <div className="text-sm">
                      {j.company_id ? <Link href={`/companies/${j.company_id}`} className="link">{j.company_name}</Link> : j.company_name}
                      <span className="text-muted"> · {fmtDate(j.started_on)} – {j.finished_on ? fmtDate(j.finished_on) : "present"}{j.location && ` · ${j.location}`}</span>
                    </div>
                    {j.description && <p className="mt-1 text-sm text-muted">{j.description}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="Meeting notes">
            {notes.length === 0 ? <EmptyState art="boat">Not mentioned in any notes yet.</EmptyState> : (
              <ul className="divide-y divide-line text-sm">
                {notes.map((n) => (
                  <li key={n.id} className="py-2">
                    <Link href={`/notes/${n.id}`} className="link">{n.title}</Link>
                    <span className="ml-2 text-xs text-muted">{fmtDate(n.met_on)} · {humanize(n.meeting_type)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Who knows them">
            {knownBy.length === 0 ? (
              <p className="text-sm text-muted">Nobody on the team knows them directly. Try a former colleague below.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {knownBy.map((k) => (
                  <li key={k.users.id} className="flex items-center gap-2">
                    <Avatar initials={k.users.avatar_initials} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/users/${k.users.id}`} className="link">{k.users.full_name}</Link>
                      <div className="truncate text-xs text-muted">{k.users.title}</div>
                    </div>
                    <Strength value={k.strength} />
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/ai-example?contact_id=${contact.id}`} className="link mt-4 block text-sm">✨ Ask AI who should intro →</Link>
          </Card>

          <Card title={`Former colleagues (${overlaps.length})`}>
            {overlaps.length === 0 ? <p className="text-sm text-muted">No overlapping colleagues in the network.</p> : (
              <ul className="space-y-2 text-sm">
                {overlaps.slice(0, 15).map((o) => {
                  const best = Math.max(0, ...o.contacts.user_contacts.map((u) => u.strength));
                  return (
                    <li key={`${o.contact_id}-${o.company_id}`} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/contacts/${o.contacts.id}`} className="link">{o.contacts.first_name} {o.contacts.last_name}</Link>
                        <div className="truncate text-xs text-muted">at {o.company_name}</div>
                      </div>
                      <Strength value={best || null} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function overlapsInTime(a: Pick<Employment, "started_on" | "finished_on">, b: Pick<Employment, "started_on" | "finished_on">) {
  const start = (d: string | null) => d ?? "1900-01-01";
  const end = (d: string | null) => d ?? "9999-12-31";
  return start(a.started_on) <= end(b.finished_on) && start(b.started_on) <= end(a.finished_on);
}
