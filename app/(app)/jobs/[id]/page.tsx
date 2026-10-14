import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Field, PageHeader, fmtDate } from "@/components/ui";
import type { Job } from "@/lib/types";

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*, companies(id, name, stage, industry)").eq("id", id).maybeSingle();
  if (!job) notFound();
  const j = job as Job & { companies: { id: string; name: string; stage: string | null; industry: string | null } };

  return (
    <>
      <PageHeader
        title={j.title}
        subtitle={<><Link href={`/companies/${j.companies.id}`} className="link">{j.companies.name}</Link> · {j.companies.industry} {j.status !== "open" && <Badge tone="tulip">{j.status}</Badge>}</>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Description">
          <div className="prose-note"><Markdown>{j.description ?? ""}</Markdown></div>
        </Card>
        <Card title="Details">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Department">{j.department}</Field>
            <Field label="Seniority">{j.seniority}</Field>
            <Field label="Location">{j.location}</Field>
            <Field label="Remote">{j.remote_policy}</Field>
            <Field label="Type">{j.employment_type}</Field>
            <Field label="Posted">{fmtDate(j.posted_on)}</Field>
            <Field label="Company stage">{j.companies.stage}</Field>
            <Field label="Status">{j.status}</Field>
          </dl>
          <Link href={`/contacts?type=candidate`} className="link mt-5 block text-sm">Browse candidates →</Link>
        </Card>
      </div>
    </>
  );
}
