/**
 * GET /api/export/{companies|jobs|contacts|users|notes}?<same filters as the page>
 * Returns a CSV of everything matching the filters (not just one page).
 */
import { getCurrentUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { listCompanies, listContacts, listJobs, listNotes, listUsers, type Params } from "@/lib/queries";

export async function GET(request: Request, ctx: RouteContext<"/api/export/[entity]">) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { entity } = await ctx.params;
  const params: Params = Object.fromEntries(new URL(request.url).searchParams);
  const date = new Date().toISOString().slice(0, 10);

  switch (entity) {
    case "companies": {
      const { rows } = await listCompanies(params, true);
      return csvResponse(`companies-${date}.csv`, toCsv(rows, ["id", "name", "kind", "industry", "stage", "hq_location", "employee_count_range", "invested_on", "website", "job_count"]));
    }
    case "jobs": {
      const { rows } = await listJobs(params, true);
      return csvResponse(`jobs-${date}.csv`, toCsv(rows, ["id", "title", "company_name", "department", "seniority", "location", "remote_policy", "employment_type", "status", "posted_on"]));
    }
    case "contacts": {
      const { rows } = await listContacts(params, true, me.profile?.id);
      return csvResponse(`contacts-${date}.csv`, toCsv(rows, ["id", "first_name", "last_name", "email", "current_title", "current_company_name", "contact_type", "location", "expertise_tags", "linkedin_url", "known_by_count", "max_strength", "my_strength"]));
    }
    case "users": {
      const { rows } = await listUsers(params);
      return csvResponse(`team-${date}.csv`, toCsv(rows, ["id", "key", "full_name", "title", "role", "is_participant", "source", "contact_count"]));
    }
    case "notes": {
      const { rows } = await listNotes(params, true);
      return csvResponse(`meeting-notes-${date}.csv`, toCsv(rows, ["id", "met_on", "title", "meeting_type", "company_name", "created_by_name", "summary"]));
    }
    default:
      return Response.json({ error: `Unknown entity ${entity}` }, { status: 404 });
  }
}
