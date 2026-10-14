import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar, Badge, Card, PageHeader, Table, Td, humanize } from "@/components/ui";
import { addEmailAction, removeEmailAction, starterNetworkAction } from "./actions";
import { AddPersonForm, BulkAddForm } from "./PeopleForms";

export const metadata = { title: "People & logins" };

export default async function AdminPeoplePage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: people } = await db
    .from("users")
    .select("id, key, full_name, title, role, source, is_participant, avatar_initials, user_logins(email, auth_user_id), user_contacts(count)")
    .eq("is_participant", true)
    .order("key");

  return (
    <>
      <PageHeader title="People & logins" subtitle="Only emails listed here can sign in. People added here survive re-seeds." />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Add a person"><AddPersonForm /></Card>
        <Card title="Bulk add">
          <p className="mb-2 text-xs text-muted">One per line: <code>Name &lt;email&gt;</code>, <code>email</code>, or <code>Name, Title, role, email[, email]</code>.</p>
          <BulkAddForm />
        </Card>
      </div>
      <Table head={["Key", "Person", "Role", "Emails (can sign in)", "Contacts", ""]}>
        {(people ?? []).map((p) => {
          const logins = (p.user_logins ?? []) as { email: string; auth_user_id: string | null }[];
          const contactCount = (p.user_contacts as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <tr key={p.id}>
              <Td className="font-mono text-xs text-muted">{p.key}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Avatar initials={p.avatar_initials} size={28} />
                  <div>
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-xs text-muted">{p.title} {p.source === "admin" && <Badge tone="canal">added in app</Badge>}</div>
                  </div>
                </div>
              </Td>
              <Td>{humanize(p.role)}</Td>
              <Td>
                <ul className="space-y-1">
                  {logins.map((l) => (
                    <li key={l.email} className="flex items-center gap-2 text-xs">
                      <span className={l.auth_user_id ? "" : "text-tulip"}>{l.email}</span>
                      <form action={removeEmailAction}>
                        <input type="hidden" name="email" value={l.email} />
                        <button className="text-muted hover:text-tulip" title="Remove this email">✕</button>
                      </form>
                    </li>
                  ))}
                </ul>
                <form action={addEmailAction} className="mt-1 flex gap-1">
                  <input type="hidden" name="user_id" value={p.id} />
                  <input name="email" type="email" placeholder="add email" className="w-40 rounded-lg border border-line bg-surface px-2 py-1 text-xs" />
                  <button className="rounded-lg border border-line px-2 text-xs hover:border-waffle">Add</button>
                </form>
              </Td>
              <Td className="tabular-nums">{contactCount}</Td>
              <Td>
                {contactCount === 0 && (
                  <form action={starterNetworkAction}>
                    <input type="hidden" name="user_id" value={p.id} />
                    <button className="whitespace-nowrap rounded-lg border border-line px-2 py-1 text-xs hover:border-waffle">🧇 Starter network</button>
                  </form>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
