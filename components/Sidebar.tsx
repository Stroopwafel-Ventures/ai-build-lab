"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand";

const NAV = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/companies", label: "Companies", icon: "🏢" },
  { href: "/jobs", label: "Jobs", icon: "💼" },
  { href: "/contacts", label: "Contacts", icon: "👥" },
  { href: "/notes", label: "Meeting notes", icon: "📝" },
  { href: "/users", label: "Team", icon: "🧇" },
  { href: "/ai-example", label: "AI example", icon: "✨" },
];
const ADMIN_NAV = [
  { href: "/admin/people", label: "People & logins", icon: "🔑" },
  { href: "/admin", label: "Admin", icon: "⚙️" },
];

export function Sidebar({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  const exact = (href: string) => path === href;

  const link = (item: { href: string; label: string; icon: string }, isActive: boolean) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
        isActive ? "bg-surface font-medium text-caramel shadow-sm" : "text-ink/80 hover:bg-surface/60"
      }`}
    >
      <span aria-hidden>{item.icon}</span>
      {item.label}
    </Link>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-sidebar px-4 py-2 md:hidden">
        <Link href="/"><Logo className="text-base" /></Link>
        <button onClick={() => setOpen(!open)} className="rounded-lg border border-line px-3 py-1 text-sm" aria-expanded={open}>
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside
        className={`${open ? "block" : "hidden"} fixed inset-x-0 top-[49px] bottom-0 z-20 overflow-y-auto bg-sidebar p-4 md:sticky md:top-0 md:block md:h-screen md:w-60 md:shrink-0 md:border-r md:border-line`}
      >
        <Link href="/" className="mb-6 hidden md:block"><Logo className="text-lg" /></Link>
        <nav className="flex flex-col gap-1">{NAV.map((i) => link(i, active(i.href)))}</nav>
        {isAdmin && (
          <>
            <div className="mt-6 mb-1 px-3 text-xs uppercase tracking-wide text-muted">Admin</div>
            <nav className="flex flex-col gap-1">{ADMIN_NAV.map((i) => link(i, i.href === "/admin" ? exact(i.href) : active(i.href)))}</nav>
          </>
        )}
        <div className="mt-8 border-t border-line pt-4 text-xs text-muted">
          <div className="truncate font-medium text-ink">{name}</div>
          <div className="truncate">{email}</div>
          <form action="/auth/signout" method="post" className="mt-2">
            <button className="text-canal hover:underline">Sign out</button>
          </form>
        </div>
      </aside>
    </>
  );
}
