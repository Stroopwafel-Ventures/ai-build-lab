# Recreate the Stroopwafel Ventures dataset with Claude

This repo ships with a fictional dataset: a VC fund, its portfolio, a network of contacts, and meeting notes. It was built for experimenting with AI-powered matching and warm introductions.

If you want to generate your own version, or a variant tuned to your firm's focus, paste the prompts below into Claude **in order, in the same conversation**. Everything generated is fictional. Please keep it that way: don't swap in real people or companies.

> **Tip:** The full dataset is large. Each stage asks for one slice as JSON. Save each response as the file named in the stage and use them as context in your own AI tools. (The repo's own fixtures in `seed/data/` use the same shape but stable UUIDs and team keys like `p04`; see `lib/fixtures.ts` if you want to convert your output for `npm run seed`.) If a response is cut off, reply "continue from where you stopped" and append the rest.

---

## Stage 0: World bible (paste first)

```
You are helping me generate a coherent, entirely fictional dataset for a venture capital platform-team sandbox. Nothing may refer to real people, real companies, or real funds. Use fictional names and `.example` web domains.

THE WORLD
- Fund: "Stroopwafel Ventures", an early-stage VC fund based in Amsterdam, investing across Europe (pre-seed to Series B, follow-ons to Series C).
- Team: 22 people.
  - Investment team (5): 2 General Partners, 2 Principals, 1 Associate. Role = "investment". They lead deals.
  - Platform team (17): a mix of roles "platform", "talent", "community", "partnerships", "operations", "admin". They support portfolio companies with hiring, intros, customers, community, and partnerships.
- Portfolio: 50 companies across fintech, climate, B2B SaaS, health, developer tools, marketplaces, and AI infrastructure.
- The wider world: ~10 large corporates (a bank, a payments company, a customer-support software company, a telco, an energy company, a retailer, a consultancy, etc.), ~10 other VC funds, and ~60 startups and scale-ups that people have worked at.

THE NETWORK
- ~450 contacts: portfolio execs (at least 2 per portfolio company), investors, candidates open to new roles, experts/NEDs/fractional execs, corporate contacts across functions, and operators.
- Contacts form CLUSTERS: groups of 3–10 people who worked at the same organization at overlapping times. This lets the data reveal warm paths and backchannel references.
- Team members know contacts with a relationship STRENGTH from 1 (barely know) to 5 (very close). Many contacts are known by several team members at different strengths, and ~15% are known by nobody directly.
- Include light realistic mess: a few duplicate contacts with name or email variants, some missing emails or LinkedIn URLs.

OUTPUT RULES
- Output valid JSON only, in a single code block, no commentary.
- Use stable string IDs I can reference across stages: companies "co_001"…, users "u_01"…, contacts "ct_001"…, jobs "job_001"…, notes "note_001"….
- Keep everything internally consistent across stages. Reuse IDs and names from earlier stages exactly.

Reply only with "Ready" and wait for the next stage.
```

## Stage 1: Companies → `companies.json`

```
Generate all companies (50 portfolio + ~80 others) as a JSON array. Fields:
id, name, kind (portfolio | corporate | investor | startup | other), industry, hq_location (mostly European cities, some US), website (.example), description (1–3 sentences), employee_count_range, linkedin_url, stage (portfolio only: pre-seed | seed | series-a | series-b | series-c+, else null), invested_on (portfolio only, ISO date, else null).
```

## Stage 2: Team → `users.json` and `company_deal_team.json`

```
Generate the 22 Stroopwafel Ventures team members as `users`. Fields:
id, full_name, title, role, avatar_initials.

Then generate `company_deal_team` as an array of { company_id, user_id, role: lead | board | support }:
- Every portfolio company has exactly one investment-team lead.
- Most have a board member.
- Some have 1–2 platform-team supporters.

Return one JSON object: { "users": [...], "company_deal_team": [...] }.
```

## Stage 3: Contacts → `contacts.json` (run in batches of ~100)

```
Generate contacts ct_001–ct_100 (I'll ask for the next batch after). Fields follow LinkedIn's export format:
id, first_name, last_name, email (null for ~30%), linkedin_url (null for ~15%), headline, summary (1–2 sentences), location, current_company_id, current_company_name, current_title, contact_type (portfolio_exec | investor | candidate | expert | corporate | operator | other), expertise_tags (array of 2–5).

Across all batches the totals should be roughly: portfolio execs ~130 (at least 2 per portfolio company), investors ~40, candidates ~80, experts ~40, corporate contacts ~60, the rest operators. Plan the clusters now, so that former colleagues share employers in the next stage.
```
Then: "Next batch: ct_101–ct_200", and so on until ~450.

## Stage 4: Employment history → `contact_employment.json` (batches matching Stage 3)

```
For contacts ct_001–ct_100, generate employment history in LinkedIn "Positions" format:
id, contact_id, company_id (null if the company isn't in companies.json), company_name, title, description, location, started_on, finished_on (null = current).

Rules:
- 2–5 positions per contact.
- Exactly one current role (a few candidates may be between roles).
- Overlapping dates within clusters.
- Portfolio execs often came from the clustered scale-ups and corporates.
```

## Stage 5: Relationships → `user_contacts.json`

```
Generate ~700 relationships { user_id, contact_id, strength 1–5 }.
- Investment team: mostly founders and investors.
- Talent roles: candidates.
- Partnerships and community roles: corporates and experts.
- Distribution: mostly strength 2–3, some 4–5, some 1.
- Many contacts are known by multiple team members at different strengths; ~15% of contacts appear nowhere in this list.
```

## Stage 6: Jobs → `jobs.json` (batches of ~10 companies)

```
For portfolio companies co_001–co_010, generate 0–12 open roles each (later stage = more roles). Fields:
id, company_id, title, department, seniority, location, remote_policy (onsite | hybrid | remote), employment_type (full-time | part-time | contract | fractional), description (2–4 paragraphs), status (mostly open), posted_on (last 90 days).
```

## Stage 7: Golden scenarios → `GOLDEN_SCENARIOS.md`

```
Design 6–8 "golden" matching scenarios that are already true in the data, or adjust earlier data so they are. Each scenario needs:
- a need (a specific open job, or something a portfolio company will raise in a meeting note)
- the best-fit contact and why
- the strongest warm path (a team member with strength 4–5)
- a worse decoy path (strength 1–2, or reachable only via a shared former employer)

Output as markdown. List any data changes needed as JSON patches.
```

## Stage 8: Meeting notes → `meeting_notes.json` (batches of 5)

```
Generate meeting notes note_001–note_005. Target ~120 notes total:
- ~60% with portfolio execs
- the rest with candidates, investors, experts, and corporate contacts
- dates spread over the last 12 months, weighted toward recent

Fields:
id, met_on, title, meeting_type (portfolio_checkin | founder_catchup | candidate_chat | investor_meeting | expert_call | corporate_meeting | event_conversation), company_id (or null), summary (1–2 sentences), body, created_by (user_id), attendee_user_ids, attendee_contact_ids.

The body is 700–1,200 words of clean, well-organized markdown, in the style of polished AI meeting notes. Use this structure, varying sections by meeting type:

### Attendees
### Context
### <4–6 topic sections with descriptive headings, bullet points, nested detail, concrete numbers>
### Asks & opportunities
### Next steps   (checkbox list: owner, action, timing)

Make the notes consistent with the rest of the data:
- reference real open jobs
- mention existing contacts and companies by name
- weave in needs ranging from explicit ("can you intro us to someone in bank procurement?") to implied ("we keep stalling at security review with large retailers"), including the golden scenarios
```
Then: "Next batch: note_006–note_010", and so on.

---

**Want a variant?** Change the world bible in Stage 0: a different fund name, sector focus, geography, or team size. Then re-run the stages.
