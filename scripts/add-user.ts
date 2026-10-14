/**
 * Add (or update) one person, before or during the session:
 *
 *   npm run add-user -- --name "Jane Doe" --email jane@x.com [--email alt@y.com] \
 *                       [--title "Platform Lead"] [--role platform] [--key p18]
 *
 * Creates them in Supabase (user, auth users, logins) AND appends/updates
 * them in seed/participants.local.json (git-ignored) with the next free key.
 */
import "./_env";
import { parseArgs } from "node:util";
import { addPersonEverywhere } from "./_addPerson";

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    email: { type: "string", multiple: true },
    title: { type: "string" },
    role: { type: "string" },
    key: { type: "string" },
  },
});

if (!values.name || !values.email?.length) {
  console.error('Usage: npm run add-user -- --name "Jane Doe" --email jane@x.com [--email alt@y.com] [--title "…"] [--role platform]');
  process.exit(1);
}

addPersonEverywhere({ full_name: values.name, emails: values.email, title: values.title, role: values.role, key: values.key })
  .then((r) => console.log(`✅ ${values.name} → ${r.key}${r.emailsAdded.length ? ` (new logins: ${r.emailsAdded.length})` : ""}`))
  .catch((e) => {
    console.error("❌", e.message ?? e);
    process.exit(1);
  });
