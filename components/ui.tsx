/**
 * Small, unstyled-by-default building blocks. Server components unless noted.
 * Keep pages simple: <PageHeader>, <Card>, <Table>, <ListToolbar>, <Pagination>.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { SkylineStrip, EmptyBike, EmptyTulip, EmptyStroopwafelStack, EmptyCanalBoat } from "@/components/brand";
import { STRENGTH_LABELS } from "@/lib/types";
import { PAGE_SIZE } from "@/lib/constants";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <SkylineStrip className="mt-4 h-6 w-full text-line" />
    </header>
  );
}

export function Card({ title, children, className, actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cx("rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const inner = (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-waffle">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold text-caramel">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "canal" | "tulip" | "waffle" }) {
  const tones = {
    neutral: "bg-line/60 text-ink",
    canal: "bg-canal/15 text-canal",
    tulip: "bg-tulip/15 text-tulip",
    waffle: "bg-waffle/20 text-caramel",
  };
  return <span className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

/** Strength 1–5 as dots; strength 5 earns the "Gezellig" badge. */
export function Strength({ value }: { value: number | null | undefined }) {
  if (!value) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5" title={`${value}/5 · ${STRENGTH_LABELS[value]}`}>
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cx("h-2 w-2 rounded-full", i <= value ? "bg-waffle" : "bg-line")} />
        ))}
      </span>
      {value === 5 ? <Badge tone="tulip">Gezellig</Badge> : <span className="sr-only">{value} of 5</span>}
    </span>
  );
}

export function Avatar({ initials, size = 32 }: { initials: string | null | undefined; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-waffle/25 font-semibold text-caramel"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "?"}
    </span>
  );
}

const EMPTY_ART = { bike: EmptyBike, tulip: EmptyTulip, stack: EmptyStroopwafelStack, boat: EmptyCanalBoat };
export function EmptyState({ art = "stack", children }: { art?: keyof typeof EMPTY_ART; children: ReactNode }) {
  const Art = EMPTY_ART[art];
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted">
      <Art className="h-24 w-32" />
      <div>{children}</div>
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-cream/60 text-xs uppercase tracking-wide text-muted">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("px-3 py-2 align-top", className)}>{children}</td>;
}

/**
 * Search + filter bar for list pages. A plain GET form: filters live in the
 * URL, so links are shareable and the CSV export reuses them.
 */
export function ListToolbar({
  params, filters = [], exportEntity, placeholder = "Search…",
}: {
  params: Record<string, string>;
  filters?: { name: string; label: string; options: (string | { value: string; label: string })[] }[];
  exportEntity?: string;
  placeholder?: string;
}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([k, v]) => v && k !== "page")).toString();
  return (
    <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
      <input
        name="q" defaultValue={params.q ?? ""} placeholder={placeholder}
        className="min-w-0 flex-1 basis-56 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-canal"
      />
      {filters.map((f) => (
        <select
          key={f.name} name={f.name} defaultValue={params[f.name] ?? ""} aria-label={f.label}
          className="rounded-xl border border-line bg-surface px-2 py-2 text-sm"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
      ))}
      <button className="rounded-xl bg-canal px-3 py-2 text-sm font-medium text-white hover:opacity-90">Filter</button>
      {qs && <Link href="?" className="text-sm text-muted hover:underline">Clear</Link>}
      {exportEntity && (
        <a href={`/api/export/${exportEntity}${qs ? `?${qs}` : ""}`} className="ml-auto rounded-xl border border-line bg-surface px-3 py-2 text-sm hover:border-waffle">
          ⬇ Download CSV
        </a>
      )}
    </form>
  );
}

export function Pagination({ params, total }: { params: Record<string, string>; total: number }) {
  const page = Math.max(1, Number(params.page) || 1);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => "?" + new URLSearchParams({ ...params, page: String(p) }).toString();
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-muted">
      <span>{total.toLocaleString()} results</span>
      {pages > 1 && (
        <span className="flex items-center gap-3">
          {page > 1 && <Link className="link" href={href(page - 1)}>← Prev</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link className="link" href={href(page + 1)}>Next →</Link>}
        </span>
      )}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5">{children ?? <span className="text-muted">—</span>}</dd>
    </div>
  );
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const humanize = (s: string | null | undefined) => (s ? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—");

/** Flatten Next's searchParams into simple strings. */
export function flatParams(sp: Record<string, string | string[] | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, (Array.isArray(v) ? v[0] : v) ?? ""]).filter(([, v]) => v));
}
