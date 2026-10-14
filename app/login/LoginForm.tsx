"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { prepareLogin } from "./actions";

/**
 * Invite-only passwordless login:
 *   1. enter email → Supabase emails a magic link AND a 6-digit code
 *   2. click the link, or type the code here (handy if the link opens in another browser)
 * shouldCreateUser: false means unknown emails can't sign themselves up.
 */
export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    await prepareLogin(email); // creates the account if this email is on the participant list
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) {
      setError(
        /signups not allowed|not found|Signups/i.test(error.message)
          ? "That email isn't on the guest list. Ask an organiser to add you."
          : error.message,
      );
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) return setError("That code didn't work. Check it, or request a new one.");
    router.replace(next);
    router.refresh();
  }

  const input = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-canal";
  const button = "w-full rounded-xl bg-canal px-4 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60";

  return step === "email" ? (
    <form onSubmit={sendLink} className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="email">Work email</label>
      <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@yourfund.com" />
      <button disabled={busy} className={button}>{busy ? "Sending…" : "Email me a link & code"}</button>
      {error && <p className="text-sm text-tulip">{error}</p>}
    </form>
  ) : (
    <form onSubmit={verifyCode} className="space-y-3">
      <p className="text-sm">
        Check <strong>{email}</strong>. Click the link, or type the 6-digit code here.
      </p>
      <input
        inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required value={code}
        onChange={(e) => setCode(e.target.value)} className={`${input} text-center text-2xl tracking-[0.4em]`} placeholder="••••••"
      />
      <button disabled={busy} className={button}>{busy ? "Checking…" : "Sign in"}</button>
      <button type="button" onClick={() => setStep("email")} className="w-full text-sm text-muted hover:underline">Use a different email</button>
      {error && <p className="text-sm text-tulip">{error}</p>}
    </form>
  );
}
