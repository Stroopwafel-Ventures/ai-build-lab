import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { isSupabaseConfigured } from "@/lib/env";

/** Every page in the (app) group requires a signed-in team member. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="font-display text-2xl font-semibold">Almost there 🧇</h1>
        <p className="mt-2">Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> (see README), then restart.</p>
      </main>
    );
  }
  const me = await requireUser();
  return (
    <div className="md:flex">
      <Sidebar name={me.profile?.full_name ?? "Not linked yet"} email={me.email} isAdmin={me.isAdmin} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10">
        {!me.profile && (
          <div className="mb-4 rounded-xl border border-tulip/40 bg-tulip/10 p-3 text-sm">
            You&apos;re signed in, but this email isn&apos;t linked to a team member yet. Ask an admin to add it on the People page.
          </div>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
