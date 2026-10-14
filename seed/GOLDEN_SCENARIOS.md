# Golden scenarios

Planted matches for testing matching and warm-introduction features. Each scenario has a **need**
(an open job or a need written into a meeting note), the **best-fit contact** with a strong warm path
(strength 4–5), and a **decoy** that matches on keywords but is a worse fit and only weakly reachable
(strength 1–2, or only via someone they used to work with).

All people and companies are fictional. Team members are referred to by key only (`p08`, `i01`);
their names live in `seed/participants.local.json`, which is never committed.

`npm run validate:fixtures` checks that every path below still holds.

| # | Need | Company | Best fit | Warm path | Decoy | Decoy path |
|---|------|---------|----------|-----------|-------|------------|
| G1 | meeting note | Kademint | Marloes Achterberg | p08 @ 5 | Bas Hoogendoorn | p02 @ 1 |
| G2 | meeting note | Reclaimr | Annemiek Stolwijk | p14 @ 4 | Ruud Kalkman | overlap only (Huisgoed Retail Group) |
| G3 | open job | Stackharbor | Sebastiaan Korving | p04 @ 5 | Gerrit Wolters | p11 @ 2 |
| G4 | meeting note | Corvia Health | Olivia Brandsma | i01 @ 5 | Mats Engström | i05 @ 2 |
| G5 | meeting note | Signalbay | Caoimhe Ferriter | p16 @ 4 | Dries Vanhoutte | p03 @ 2 |
| G6 | meeting note | Sanavo Care | Eveline Kortekaas | p15 @ 4 | Jonas Petrakis | p07 @ 2 |
| G7 | meeting note | Windvane Grid | Reinout Hazelhoff | i02 @ 5 | Yara Mertens | p13 @ 1 |
| G8 | open job | Grachtpay | Konstantin Riedel | p07 @ 5 | Lennart Bosch | p04 @ 2 |

## G1. Kademint wants a bank distribution partner

**Need.** Explicit ask: an intro to someone at Noordhaven Bank who owns SME banking partnerships, to distribute Kademint's cash-management product to the bank's SME clients.

- Meeting note: **Kademint: September update** (2026-09-27, `portfolio_checkin`) — `meeting_notes.id = 427f0ea5-86f9-5c63-9235-d357ba8a71e3`
- Planted in the note: “Distribution through a bank is now the single biggest lever on CAC”; “Noordhaven Bank is the obvious first partner”

**Best fit:** Marloes Achterberg, Head of SME Banking Partnerships at Noordhaven Bank — `contacts.id = bc1b715d-2cff-5e03-a2cc-4cbf13da596c`

- Why: Owns SME banking partnerships at the exact bank Kademint named, previously built a payments partner programme, and is known very well by a partnerships participant.
- Warm path: **p08** knows them at strength **5**.

**Decoy:** Bas Hoogendoorn, Product Owner, Retail Mobile App at Noordhaven Bank — `contacts.id = 250fe7c2-2c9a-5ff9-9037-4636d6948dd0`

- Why it's worse: Right bank, wrong function: he owns the consumer app, which is exactly the team Kademint already spoke to. Only a weak tie.
- Decoy path: **p02** at strength **1** (no other team member knows them).

**How a matcher could find it:**

```sql
-- contacts c join companies co on co.id = c.current_company_id where co.name ilike '%Noordhaven%' and (c.current_title ilike '%SME%' or c.current_title ilike '%partnership%') → join user_contacts uc on uc.contact_id = c.id order by uc.strength desc
```

## G2. Reclaimr keeps stalling in retail procurement

**Need.** Implied need: Reclaimr's retail pilots succeed operationally but stall at central procurement. Nobody asked for an intro, but an ex-retail procurement leader would unblock them.

- Meeting note: **Reclaimr: October update** (2026-10-06, `portfolio_checkin`) — `meeting_notes.id = 0297aa09-28a8-59db-a1c1-db2b7e0b7655`
- Planted in the note: “Both large-retailer pilots hit their operational targets but neither has converted”; “We keep losing momentum at the procurement stage with large retailers”

**Best fit:** Annemiek Stolwijk, Independent Retail Procurement Advisor, self-employed — `contacts.id = aa901a93-fab3-575b-9d31-102ca0c06030`

- Why: Ran non-food procurement (including packaging and returns) at the retailer type Reclaimr sells to, and now advises startups on exactly this. Known well by a partnerships participant.
- Warm path: **p14** knows them at strength **4**.

**Decoy:** Ruud Kalkman, Category Manager, Household at Huisgoed Retail Group — `contacts.id = da6fb941-1ce0-5bb7-a479-28aae5cef04b`

- Why it's worse: A current insider at the retailer with 'category manager' in the title, but he owns household ranges, not packaging or procurement, and nobody on the team knows him: reachable only through a former colleague.
- Decoy path: nobody on the team knows them directly. Reachable only through employment overlap at Huisgoed Retail Group with Annemiek Stolwijk (who **p14** knows at 4).

**How a matcher could find it:**

```sql
-- search meeting_notes.body for 'procurement' + 'retailer' → contact_employment ce join companies co on co.id = ce.company_id where co.industry = 'Retail' and ce.title ilike '%procurement%' (include past roles) → rank by max(user_contacts.strength)
```

## G3. Stackharbor needs a VP Engineering

**Need.** Open job: VP Engineering at Stackharbor (Series A developer-tools company, Amsterdam).

- Job: **VP Engineering** at Stackharbor — `jobs.id = 0c49a779-55d8-5cfe-896d-4bd25ba2ffa5` (status `open`, posted 2026-09-06)
- Meeting note: **Stackharbor: October update** (2026-10-08, `portfolio_checkin`) — `meeting_notes.id = 160fa691-6eac-5847-b369-edbceb1a3622`
- Planted in the note: “VP Engineering is the critical hire for the next 12 months”

**Best fit:** Sebastiaan Korving, Director of Engineering at Quillstack — `contacts.id = a634619e-e40a-5a13-bccd-8a398561bfd2`

- Why: Has scaled engineering at a developer-tools company from 12 to 55, deep platform background, wants a VP role in Amsterdam, and a talent participant knows him very well.
- Warm path: **p04** knows them at strength **5**.

**Decoy:** Gerrit Wolters, VP Engineering at Huisgoed Retail Group — `contacts.id = 6a7f9010-2f03-597e-86a6-86cd3df83c5b`

- Why it's worse: Exact title match ('VP Engineering'), but in a 400-person, largely outsourced retail IT organisation with no developer-tools experience; only a weak tie.
- Decoy path: **p11** at strength **2** (no other team member knows them).

**How a matcher could find it:**

```sql
-- jobs j where j.title = 'VP Engineering' → contacts whose expertise_tags && '{developer tools,platform engineering}' and seniority ≥ director (current_title ilike '%Director of Engineering%' or '%VP Engineering%') → join user_contacts, prefer strength ≥ 4
```

## G4. Corvia Health is raising a Series C

**Need.** Explicit ask: intros to growth investors with health-tech depth for a ~€35m Series C, ideally someone who understands reimbursement-driven revenue.

- Meeting note: **Founder catch-up: Corvia Health** (2026-10-11, `founder_catchup`) — `meeting_notes.id = bafb8383-5ccd-5670-bb0c-7b66b7121ecc`
- Planted in the note: “Planning to raise a ~€35m Series C, kicking off in Q1 2027”; “Generalist growth funds keep getting stuck on the reimbursement model”

**Best fit:** Olivia Brandsma, Partner at Copperbeech Growth — `contacts.id = fc6d7230-fe3d-579c-9782-05ce1dcd0a6e`

- Why: A partner at a growth fund specialising in health tech, with a reimbursement background (ex-insurer), able to lead a €35m round. A general partner knows her very well.
- Warm path: **i01** knows them at strength **5**.

**Decoy:** Mats Engström, Associate at Fjordline Ventures — `contacts.id = 3fcb06d8-9d38-502d-a73c-af67aea39227`

- Why it's worse: Has 'health tech' in his tags, but he is an associate at a seed/Series A fund that cannot lead a €35m round; weak tie.
- Decoy path: **i05** at strength **2** (no other team member knows them).

**How a matcher could find it:**

```sql
-- contacts where contact_type = 'investor' and expertise_tags && '{health tech,medtech}' join companies co on co.id = c.current_company_id (check co.description for growth / Series B+) and current_title in Partner/GP → max user_contacts.strength
```

## G5. Signalbay wants to partner with Assistora

**Need.** Semi-explicit ask: Signalbay wants a marketplace listing and co-sell with Assistora (60% of their customers use it) and asks who runs Assistora's partner ecosystem.

- Meeting note: **Signalbay x Stroopwafel check-in** (2026-10-06, `portfolio_checkin`) — `meeting_notes.id = 8e05b3b4-fe65-5f86-88b4-ebafbb50c51e`
- Planted in the note: “About 60% of Signalbay customers run their support desk on Assistora”; “No relationship with Assistora's partner team yet”

**Best fit:** Caoimhe Ferriter, VP Partnerships & Ecosystem at Assistora — `contacts.id = 8d540c8d-7e84-5f7b-afde-a7e1a286e1b3`

- Why: Currently owns Assistora's partner ecosystem and app marketplace (exactly the need), and a partnerships participant knows her well.
- Warm path: **p16** knows them at strength **4**.

**Decoy:** Dries Vanhoutte, Partnerships Lead at Junoflow — `contacts.id = 3a4b1bcf-b677-5274-b797-7283ef9a5cfc`

- Why it's worse: Used to manage partners at Assistora, so he matches on keywords, but he left in 2023 (the reshuffle the founders mentioned); weak tie.
- Decoy path: **p03** at strength **2** (no other team member knows them).

**How a matcher could find it:**

```sql
-- contact_employment ce join companies co on co.id = ce.company_id where co.name = 'Assistora' and ce.finished_on is null and ce.title ilike '%partner%' → join user_contacts order by strength desc (filtering on finished_on is null removes the decoy)
```

## G6. Sanavo Care needs senior finance help

**Need.** Implied need: Sanavo Care's CEO is doing the board pack herself, the first statutory audit is coming and finance is a junior controller. Nobody asked, but a fractional CFO with health-care experience is the fix.

- Meeting note: **Sanavo Care: September update** (2026-09-27, `portfolio_checkin`) — `meeting_notes.id = 6dc24c9b-4f88-5d7e-8582-4299a6cc0cd1`
- Planted in the note: “Board reporting is eating the CEO's time”; “First statutory audit is due next spring, and the new working-capital line comes with covenant reporting”

**Best fit:** Eveline Kortekaas, Fractional CFO, self-employed — `contacts.id = cce29e5f-07a3-5a64-843b-5e56af5c7ab3`

- Why: A fractional CFO who has done first audits, board reporting and debt covenants specifically in health care (hospital group + health-tech CFO); an operations participant knows her well.
- Warm path: **p15** knows them at strength **4**.

**Decoy:** Jonas Petrakis, Senior Financial Analyst at Dijkwacht Insurance — `contacts.id = 2bf22445-28ef-53ec-8052-418a905c8ee7`

- Why it's worse: Matches on 'healthcare' and 'financial reporting', but is far too junior to own a board pack or an audit; weak tie through a talent participant.
- Decoy path: **p07** at strength **2** (no other team member knows them).

**How a matcher could find it:**

```sql
-- full-text search meeting_notes for 'board pack' / 'audit' (no explicit ask) → contacts where expertise_tags && '{fractional CFO,audit readiness}' and contact_type = 'expert' → prefer healthcare in tags/employment → max user_contacts.strength
```

## G7. Windvane Grid needs a pilot with Veenstroom Energy

**Need.** Explicit ask: who at Veenstroom Energy owns flexibility / grid innovation, for a residential battery aggregation pilot.

- Meeting note: **Windvane Grid monthly sync** (2026-10-06, `portfolio_checkin`) — `meeting_notes.id = bb98db97-7265-5428-ab15-c6b64ed409d4`
- Planted in the note: “A pilot with a large supplier is the missing proof point before the Series B”; “Previous outreach went to Veenstroom's marketing team and went nowhere”

**Best fit:** Reinout Hazelhoff, Head of Flexibility & Grid Innovation at Veenstroom Energy — `contacts.id = b2a006c9-8aee-50d9-95bc-a7f8b1d35836`

- Why: Owns flexibility and grid innovation (including startup pilots) at the named utility; a general partner knows him very well.
- Warm path: **i02** knows them at strength **5**.

**Decoy:** Yara Mertens, Head of Retail Marketing at Veenstroom Energy — `contacts.id = 2a2375c4-84ce-57fd-8479-23b124d2c098`

- Why it's worse: Senior and at the right company, but in retail marketing: the team the founders already tried without success. Only a weak tie.
- Decoy path: **p13** at strength **1** (no other team member knows them).

**How a matcher could find it:**

```sql
-- contacts c join companies co on co.id = c.current_company_id where co.name = 'Veenstroom Energy' and (c.current_title ilike '%flexib%' or c.current_title ilike '%innovation%' or 'grid flexibility' = any(c.expertise_tags)) → join user_contacts order by strength desc
```

## G8. Grachtpay needs a Head of Sales for DACH

**Need.** Open job: Head of Sales, DACH at Grachtpay (Series B embedded payments, Berlin-based role).

- Job: **Head of Sales, DACH** at Grachtpay — `jobs.id = b91a4903-ade6-58e6-88e5-20ab46ee8a30` (status `open`, posted 2026-09-20)
- Meeting note: **Grachtpay: October update** (2026-10-08, `portfolio_checkin`) — `meeting_notes.id = 21a75784-0291-503a-860f-75767d28ea25`
- Planted in the note: “DACH is now the priority expansion market”

**Best fit:** Konstantin Riedel, Regional Sales Director DACH at Ravelpay — `contacts.id = 903252c2-edb0-5950-854c-bb00357b3321`

- Why: Runs DACH sales at a payments company selling to marketplaces, native German speaker, has built a team, open to Berlin; a talent participant knows him very well.
- Warm path: **p07** knows them at strength **5**.

**Decoy:** Lennart Bosch, Head of Sales at Brightgrove HR — `contacts.id = ec670ecc-9b14-511f-9b66-5c9e37dc4080`

- Why it's worse: 'Head of Sales' title matches, but Benelux-only HR software, no payments and no German; weak tie.
- Decoy path: **p04** at strength **2** (no other team member knows them).

**How a matcher could find it:**

```sql
-- jobs j where j.title ilike '%Head of Sales%DACH%' → contacts where expertise_tags && '{payments,DACH}' and contact_type in ('candidate','corporate') → join user_contacts, prefer strength ≥ 4
```
