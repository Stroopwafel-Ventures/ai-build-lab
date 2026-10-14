"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFixtures } from "@/lib/seed";

export async function reseedAction(): Promise<{ message: string }> {
  await requireAdmin();
  try {
    const report = await loadFixtures(createAdminClient());
    revalidatePath("/", "layout");
    const counts = Object.entries(report.counts).map(([k, v]) => `${k}: ${v}`).join(", ");
    return { message: `Done. ${counts}.${report.skipped.length ? ` Skipped: ${report.skipped.join("; ")}` : ""}` };
  } catch (e) {
    return { message: `Failed: ${(e as Error).message}` };
  }
}
