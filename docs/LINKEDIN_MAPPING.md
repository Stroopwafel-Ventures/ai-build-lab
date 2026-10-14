# LinkedIn export → our schema

LinkedIn lets anyone download their data (Settings → Data privacy → *Get a copy of your data*).
Two files in that export map cleanly onto our tables. **The import isn't built yet.** This is the
spec for whoever builds it.

> ⚠️ A real LinkedIn export is real personal data. Import it only into a private database
> with the owner's consent, and never commit it or turn it into seed fixtures.

## `Connections.csv` → `contacts` (+ `user_contacts`)

The file starts with a few lines of notes; the header row is `First Name,Last Name,URL,Email Address,Company,Position,Connected On`.

| Connections.csv | `contacts` column | Notes |
|---|---|---|
| First Name | `first_name` | |
| Last Name | `last_name` | |
| URL | `linkedin_url` | Primary dedupe key. Normalise: lowercase, strip trailing `/` and query string. |
| Email Address | `email` | Usually empty: only shared if the connection allowed it. |
| Company | `current_company_name` | Raw string. Then try to match `companies.name` (case-insensitive, trimmed, trigram ≥ 0.6) → `current_company_id`. |
| Position | `current_title` | |
| Connected On | — | Not stored yet. Candidate for `user_contacts.created_at` or a future `connected_on` column. |
| — | `contact_type` | Not in the export. Default `other`; classify later (rules or Claude). |
| — | `source` | `linkedin_import` |

Each imported row also creates `user_contacts(user_id = importing team member, contact_id, strength)`.
LinkedIn has no strength, so default to **2** and let the user adjust it. Bump to 3 if there's an email (they chose to share it).

**Dedupe order:** `linkedin_url` → `email` → (`first_name`, `last_name`, `current_company_name`).
On a match, keep the existing contact and just add the `user_contacts` row. Never overwrite manually edited fields.

## `Positions.csv` → `contact_employment`

Your **own** positions, so this only applies when a contact uploads their own export (or for
enriching team members). Header: `Company Name,Title,Description,Location,Started On,Finished On`.

| Positions.csv | `contact_employment` column | Notes |
|---|---|---|
| Company Name | `company_name` | Always populated. |
| — | `company_id` | Match against `companies.name` as above; null if no match. |
| Title | `title` | |
| Description | `description` | |
| Location | `location` | |
| Started On | `started_on` | Format is `Mon YYYY` (e.g. `Mar 2021`) → first of month. |
| Finished On | `finished_on` | Empty means current role → `null`. |

## `Profile.csv` → `contacts` (enrichment)

| Profile.csv | `contacts` column |
|---|---|
| First Name / Last Name | `first_name` / `last_name` |
| Headline | `headline` |
| Summary | `summary` |
| Geo Location | `location` |

## Building the importer

1. Upload UI (out of scope today) or a script: `scripts/import-linkedin.ts path/to/Connections.csv --user p04`.
2. Parse with a CSV library; skip LinkedIn's preamble lines until the header row.
3. Upsert contacts by the dedupe order above; insert `user_contacts`.
4. Optionally run `npm run embed` afterwards.
