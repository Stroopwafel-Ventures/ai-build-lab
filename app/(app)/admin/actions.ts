"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFixtures, upsertParticipants } from "@/lib/seed";
import { participantsFromEnv } from "@/lib/participantList";

export async function reseedAction(): Promise<{ message: string }> {
  await requireAdmin();
  try {
    const db = createAdminClient();
    // On Vercel there's no local participant file; PARTICIPANTS_JSON stands in.
    const participants = participantsFromEnv();
    const p = participants.length ? await upsertParticipants(db, participants) : null;
    const report = await loadFixtures(db);
    revalidatePath("/", "layout");
    const counts = Object.entries(report.counts).map(([k, v]) => `${k}: ${v}`).join(", ");
    return { message: `Done. ${p ? `Participants: ${p.people} (${p.newLogins} new logins). ` : ""}${counts}.${report.skipped.length ? ` Skipped: ${report.skipped.join("; ")}` : ""}` };
  } catch (e) {
    return { message: `Failed: ${(e as Error).message}` };
  }
}
