import type { Metadata } from "next";
import { LoginHero, Logo } from "@/components/brand";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.2fr_1fr]">
      <div className="relative hidden items-end overflow-hidden bg-[linear-gradient(180deg,#f7e3bd_0%,var(--cream)_100%)] lg:flex dark:bg-none">
        <LoginHero className="w-full" />
      </div>
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="text-2xl" />
          <LoginHero className="mt-6 w-full rounded-2xl lg:hidden" />
          <h1 className="mt-8 font-display text-3xl font-semibold">Welkom!</h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            Sign in to the Stroopwafel Ventures platform. Invite-only: use the email the organisers have on file.
          </p>
          <LoginForm next={next} initialError={error} />
          <p className="mt-10 text-xs text-muted">All companies, people and notes in this app are fictional.</p>
        </div>
      </div>
    </main>
  );
}
