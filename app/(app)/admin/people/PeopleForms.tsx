"use client";
import { useActionState, useMemo, useState } from "react";
import { parseBulkLines, ROLES } from "@/lib/participants";
import { addPersonAction, bulkAddAction, type ActionState } from "./actions";

const input = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm";
const button = "rounded-xl bg-canal px-4 py-2 text-sm font-medium text-white disabled:opacity-50";

function Status({ state }: { state: ActionState }) {
  return (
    <>
      {state.ok && <p className="mt-2 text-sm text-canal">{state.ok}</p>}
      {state.error && <p className="mt-2 text-sm text-tulip">{state.error}</p>}
    </>
  );
}

export function AddPersonForm() {
  const [state, action, pending] = useActionState(addPersonAction, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <input name="full_name" required placeholder="Full name" className={input} />
      <input name="title" placeholder="Title at Stroopwafel (e.g. Platform Lead)" className={input} />
      <select name="role" defaultValue="platform" className={input}>
        {ROLES.map((r) => <option key={r}>{r}</option>)}
      </select>
      <input name="emails" required placeholder="email (add more separated by commas)" className={input} />
      <div className="sm:col-span-2">
        <button disabled={pending} className={button}>{pending ? "Adding…" : "Add person"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function BulkAddForm() {
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(bulkAddAction, {});
  const preview = useMemo(() => parseBulkLines(text), [text]);
  return (
    <form action={action}>
      <textarea
        name="bulk" rows={6} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={"Jane Doe <jane@example.com>\nsam@example.com\nAlex Smit, Talent Partner, talent, alex@example.com, alex.alt@example.com"}
        className={`${input} font-mono`}
      />
      {preview.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted"><tr><th className="py-1">Name</th><th>Title</th><th>Role</th><th>Emails</th><th /></tr></thead>
            <tbody>
              {preview.map((p, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1">{p.full_name}</td>
                  <td>{p.title ?? "—"}</td>
                  <td>{p.role}</td>
                  <td>{p.emails.join(", ")}</td>
                  <td className="text-tulip">{p.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button disabled={pending || !preview.some((p) => !p.error)} className={`${button} mt-3`}>
        {pending ? "Adding…" : `Add ${preview.filter((p) => !p.error).length} people`}
      </button>
      <Status state={state} />
    </form>
  );
}
