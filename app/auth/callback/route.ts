import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the magic link lands. Handles both styles Supabase can send:
 *   ?code=…                     (PKCE; must be opened in the same browser)
 *   ?token_hash=…&type=email    (works in any browser; see README email template)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing code") };

  if (error) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", "That link didn't work (it may have been opened in a different browser). Use the 6-digit code instead.");
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}
