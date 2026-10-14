"use client";
import { useActionState } from "react";
import { reseedAction } from "./actions";

export function ReseedButton() {
  const [state, action, pending] = useActionState(reseedAction, { message: "" });
  return (
    <form
      action={action}
      onSubmit={(e) => { if (!confirm("Wipe and reload all app data? People and logins are kept.")) e.preventDefault(); }}
    >
      <button disabled={pending} className="rounded-xl bg-tulip px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? "Re-seeding…" : "Re-seed data"}
      </button>
      {state.message && <p className="mt-3 text-sm">{state.message}</p>}
    </form>
  );
}
