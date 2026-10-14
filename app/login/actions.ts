"use server";
import { createServiceClient } from "@/lib/supabase/service";
import { addParticipant } from "@/lib/participants";
import { emailsOf, participantsFromEnv } from "@/lib/participantList";

/**
 * Called by the login form before it asks Supabase for a code.
 * If PARTICIPANTS_JSON (a Vercel env var) lists this email, make sure the
 * person and their login exist. This lets a fresh deploy work without anyone
 * running `npm run seed` from a laptop. Emails not on the list get nothing.
 */
export async function prepareLogin(email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  const entry = participantsFromEnv().find((p) => emailsOf(p).includes(e));
  if (!entry || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await addParticipant(createServiceClient(), {
      key: entry.key, full_name: entry.full_name, title: entry.title, role: entry.role,
      emails: emailsOf(entry), source: "seed",
    });
  } catch (err) {
    console.error("prepareLogin failed:", (err as Error).message);
  }
}
