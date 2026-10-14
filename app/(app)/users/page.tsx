import Link from "next/link";
import { listUsers } from "@/lib/queries";
import { ROLES } from "@/lib/participants";
import { Avatar, Badge, ListToolbar, PageHeader, Table, Td, flatParams, humanize } from "@/components/ui";

export const metadata = { title: "Team" };

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const params = flatParams(await searchParams);
  const { rows, total } = await listUsers(params);

  return (
    <>
      <PageHeader title="Team" subtitle={`${total} people at Stroopwafel Ventures: the investment team and the platform crew.`} />
      <ListToolbar params={params} exportEntity="users" placeholder="Search name or title…" filters={[{ name: "role", label: "Any role", options: [...ROLES] }]} />
      <Table head={["Name", "Title", "Role", "Contacts", ""]}>
        {rows.map((u) => (
          <tr key={u.id} className="hover:bg-cream/50">
            <Td>
              <Link href={`/users/${u.id}`} className="flex items-center gap-2">
                <Avatar initials={u.avatar_initials} size={28} />
                <span className="link font-medium">{u.full_name}</span>
              </Link>
            </Td>
            <Td>{u.title}</Td>
            <Td><Badge tone={u.role === "investment" ? "canal" : "waffle"}>{humanize(u.role)}</Badge></Td>
            <Td className="tabular-nums">{u.contact_count}</Td>
            <Td className="text-xs text-muted">{u.is_participant ? "" : "fictional"}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
