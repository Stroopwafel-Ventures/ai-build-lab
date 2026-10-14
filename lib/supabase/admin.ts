import "server-only";
import { createServiceClient } from "./service";

/**
 * Service-role client for admin server actions. Bypasses RLS, so use it
 * ONLY after requireAdmin(). Never import this into a client component.
 */
export function createAdminClient() {
  return createServiceClient();
}
