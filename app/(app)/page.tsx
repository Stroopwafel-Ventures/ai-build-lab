import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, Stat, Strength, fmtDate, humanize } from "@/components/ui";
import { STRENGTH_LABELS } from "@/lib/types";
import { REPO_URL } from "@/lib/constants";
import { GitHubIcon } from "@/components/GitHubIcon";

/** Goedemorgen / Goedemiddag / Goedenavond, on Amsterdam time. */
function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Amsterdam" }).format(new Date()));
  return hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
}

export default async function Dashboard() {
  const me = await requireUser();
  const supabase = await createClient();
  const count = (table: string) => supabase.from(table).select("*", { count: "exact", head: true });

  const [companies, portfolio, jobs, contacts, notes, users, rels, mine, recent] = await Promise.all([
    count("companies"),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("kind", "portfolio"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
    count("contacts"),
    count("meeting_notes"),
    count("users"),
    count("user_contacts"),
    me.profile
      ? supabase.from("user_contacts").select("strength, contacts(id, first_name, last_name, current_title, current_company_name)").eq("user_id", me.profile.id).order("strength", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("meeting_notes").select("id, title, met_on, meeting_type, summary, companies(name)").order("met_on", { ascending: false }).limit(6),
  ]);

  const myRels = (mine.data ?? []) as unknown as { strength: number; contacts: { id: string; first_name: string; last_name: string; current_title: string | null; current_company_name: string | null } }[];
  const byStrength = [5, 4, 3, 2, 1].map((s) => ({ s, n: myRels.filter((r) => r.strength === s).length }));
  const maxN = Math.max(1, ...byStrength.map((b) => b.n));
  const firstName = me.profile?.full_name.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{greeting()}{firstName && `, ${firstName}`} 🧇</h1>
          <p className="mt-1 text-muted">Here&apos;s the Stroopwafel Ventures network at a glance.</p>
        </div>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium shadow-sm transition hover:border-waffle"
        >
          <GitHubIcon className="h-4 w-4" />
          Code on GitHub
          <span aria-hidden className="text-muted">↗</span>
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Portfolio companies" value={portfolio.count ?? 0} href="/companies?kind=portfolio" />
        <Stat label="Open jobs" value={jobs.count ?? 0} href="/jobs" />
        <Stat label="Contacts" value={contacts.count ?? 0} href="/contacts" />
        <Stat label="Meeting notes" value={notes.count ?? 0} href="/notes" />
        <Stat label="All companies" value={companies.count ?? 0} href="/companies" />
        <Stat label="Team members" value={users.count ?? 0} href="/users" />
        <Stat label="Relationships" value={rels.count ?? 0} />
        <Stat label="You know" value={myRels.length} href="/contacts?known=me" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your contacts by strength">
          {myRels.length === 0 ? (
            <EmptyState art="tulip">No relationships yet. An admin can give you a starter network.</EmptyState>
          ) : (
            <>
              <div className="space-y-2">
                {byStrength.map(({ s, n }) => (
                  <div key={s} className="flex items-center gap-3 text-sm">
                    <div className="w-28 shrink-0 text-muted">{s} · {STRENGTH_LABELS[s]}</div>
                    <div className="h-3 flex-1 rounded-full bg-line/50">
                      <div className="h-3 rounded-full bg-waffle" style={{ width: `${(n / maxN) * 100}%` }} />
                    </div>
                    <div className="w-8 text-right tabular-nums">{n}</div>
                  </div>
                ))}
              </div>
              <h3 className="mt-5 mb-2 text-xs uppercase tracking-wide text-muted">Closest</h3>
              <ul className="divide-y divide-line text-sm">
                {myRels.slice(0, 5).map((r) => (
                  <li key={r.contacts.id} className="flex items-center justify-between gap-2 py-2">
                    <Link href={`/contacts/${r.contacts.id}`} className="link min-w-0 truncate">
                      {r.contacts.first_name} {r.contacts.last_name}
                      <span className="text-muted"> · {r.contacts.current_title} {r.contacts.current_company_name && `at ${r.contacts.current_company_name}`}</span>
                    </Link>
                    <Strength value={r.strength} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Recent meeting notes" actions={<Link href="/notes" className="link text-sm">All notes →</Link>}>
          {(recent.data ?? []).length === 0 ? (
            <EmptyState art="boat">No notes yet. Run <code>npm run seed</code>.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {(recent.data ?? []).map((n) => (
                <li key={n.id} className="py-3">
                  <Link href={`/notes/${n.id}`} className="link font-medium">{n.title}</Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{fmtDate(n.met_on)}</span>
                    <Badge>{humanize(n.meeting_type)}</Badge>
                    {(n.companies as unknown as { name: string } | null)?.name && <span>{(n.companies as unknown as { name: string }).name}</span>}
                  </div>
                  {n.summary && <p className="mt-1 line-clamp-2 text-sm">{n.summary}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
