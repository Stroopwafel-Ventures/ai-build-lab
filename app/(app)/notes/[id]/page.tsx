import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Badge, Card, PageHeader, fmtDate, humanize } from "@/components/ui";
import type { MeetingNote } from "@/lib/types";

export default async function NotePage({ params }: PageProps<"/notes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: note } = await supabase
    .from("meeting_notes")
    .select("*, companies(id, name), author:users!meeting_notes_created_by_fkey(id, full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!note) notFound();

  const [{ data: userLinks }, { data: contactLinks }] = await Promise.all([
    supabase.from("meeting_note_users").select("users(id, full_name, title, avatar_initials)").eq("note_id", id),
    supabase.from("meeting_note_contacts").select("contacts(id, first_name, last_name, current_title, current_company_name)").eq("note_id", id),
  ]);
  const n = note as MeetingNote & { companies: { id: string; name: string } | null; author: { id: string; full_name: string } | null };
  const team = (userLinks ?? []).map((l) => l.users as unknown as { id: string; full_name: string; title: string | null; avatar_initials: string | null });
  const contacts = (contactLinks ?? []).map((l) => l.contacts as unknown as { id: string; first_name: string; last_name: string; current_title: string | null; current_company_name: string | null });

  // Turn attendee names in the markdown into links to their pages.
  const links: [string, string][] = [
    ...team.map((u) => [u.full_name, `/users/${u.id}`] as [string, string]),
    ...contacts.map((c) => [`${c.first_name} ${c.last_name}`, `/contacts/${c.id}`] as [string, string]),
  ];
  const body = linkNames(n.body ?? "", links);

  return (
    <>
      <PageHeader
        title={n.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {fmtDate(n.met_on)}
            <Badge>{humanize(n.meeting_type)}</Badge>
            {n.companies && <Link className="link" href={`/companies/${n.companies.id}`}>{n.companies.name}</Link>}
            {n.author && <span>· notes by <Link className="link" href={`/users/${n.author.id}`}>{n.author.full_name}</Link></span>}
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {n.summary && <p className="mb-2 rounded-xl bg-waffle/10 p-3 text-sm"><strong>Summary:</strong> {n.summary}</p>}
          <article className="prose-note"><Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown></article>
        </Card>
        <Card title="Attendees">
          <ul className="space-y-3 text-sm">
            {team.map((u) => (
              <li key={u.id} className="flex items-center gap-2">
                <Avatar initials={u.avatar_initials} size={28} />
                <div><Link href={`/users/${u.id}`} className="link">{u.full_name}</Link><div className="text-xs text-muted">{u.title} · Stroopwafel</div></div>
              </li>
            ))}
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Avatar initials={`${c.first_name[0]}${c.last_name[0]}`} size={28} />
                <div><Link href={`/contacts/${c.id}`} className="link">{c.first_name} {c.last_name}</Link><div className="text-xs text-muted">{c.current_title}{c.current_company_name && `, ${c.current_company_name}`}</div></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

/** Link the first mention of each name inside each line of the Attendees section, and the first mention elsewhere. */
function linkNames(md: string, links: [string, string][]) {
  let out = md;
  for (const [name, href] of links.sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`(?<![\\[\\w])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w\\]])`);
    out = out.replace(re, `[${name}](${href})`);
  }
  return out;
}
