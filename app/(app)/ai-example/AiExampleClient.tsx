"use client";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { StroopwafelSpinner } from "@/components/brand";

interface Result {
  summary: string;
  best_connector_user_id: string | null;
  reasoning: string;
  mocked: boolean;
  error?: string;
}

export function AiExampleClient({ contacts, initialContactId }: { contacts: { id: string; label: string }[]; initialContactId: string }) {
  const [contactId, setContactId] = useState(initialContactId);
  const [filter, setFilter] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);

  const shown = filter ? contacts.filter((c) => c.label.toLowerCase().includes(filter.toLowerCase())).slice(0, 200) : contacts;

  async function run() {
    setBusy(true);
    setResult(null);
    setDraft("");
    const res = await fetch("/api/ai/example", { method: "POST", body: JSON.stringify({ contact_id: contactId }) });
    setResult(await res.json());
    setBusy(false);
  }

  // Reads the streamed response chunk by chunk, so text appears as Claude writes it.
  async function streamDraft() {
    if (!result?.best_connector_user_id) return;
    setDrafting(true);
    setDraft("");
    const res = await fetch("/api/ai/draft-intro", {
      method: "POST",
      body: JSON.stringify({ contact_id: contactId, connector_user_id: result.best_connector_user_id, reason: "a portfolio founder would value their advice" }),
    });
    if (!res.ok || !res.body) {
      setDraft((await res.json()).error ?? "Something went wrong");
    } else {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setDraft((d) => d + decoder.decode(value, { stream: true }));
      }
    }
    setDrafting(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="1. Pick a contact">
        <input
          value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…"
          className="mb-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        />
        <select
          size={10} value={contactId} onChange={(e) => setContactId(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface p-1 text-sm"
        >
          {shown.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button
          disabled={!contactId || busy} onClick={run}
          className="mt-3 w-full rounded-xl bg-canal px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Thinking…" : "Ask Claude"}
        </button>
      </Card>

      <Card title="2. Result">
        {busy && <div className="flex justify-center py-10"><StroopwafelSpinner size={48} /></div>}
        {!busy && !result && <p className="text-sm text-muted">The JSON response will appear here.</p>}
        {result?.error && <p className="text-sm text-tulip">{result.error}</p>}
        {result && !result.error && (
          <div className="space-y-3 text-sm">
            <p><strong>Summary.</strong> {result.summary}</p>
            <p>
              <strong>Best connector.</strong>{" "}
              {result.best_connector_user_id ? <Link className="link" href={`/users/${result.best_connector_user_id}`}>View team member →</Link> : "Nobody directly"}
            </p>
            <p><strong>Reasoning.</strong> {result.reasoning}</p>
            <details>
              <summary className="cursor-pointer text-muted">Raw JSON</summary>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-cream p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
            </details>
            {result.best_connector_user_id && (
              <button onClick={streamDraft} disabled={drafting} className="rounded-xl border border-line px-3 py-2 hover:border-waffle disabled:opacity-50">
                {drafting ? "Writing…" : "✉️ Stream an intro-request draft"}
              </button>
            )}
            {draft && <pre className="whitespace-pre-wrap rounded-xl bg-cream p-3 font-sans">{draft}</pre>}
          </div>
        )}
      </Card>
    </div>
  );
}
