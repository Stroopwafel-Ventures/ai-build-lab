/**
 * Light mess, part 1: near-duplicate contacts.
 *
 * Real CRMs are full of the same person entered twice: a nickname, a
 * differently capitalised surname, a personal email instead of a work one.
 * We plant ~10 of these so matchers have to deal with them. Each duplicate
 * gets a short (2-position) copy of the original's recent history.
 */
import type { ContactFixture, EmploymentFixture } from "../fixtures";
import { emailLocal, slugify, stableId } from "./ids";
import { NAME_VARIANTS } from "./names";
import type { Rng } from "./rng";
import type { ContactMeta } from "./types";

export function plantDuplicates(
  contacts: ContactFixture[], meta: Record<string, ContactMeta>, employment: EmploymentFixture[], rng: Rng, count = 10,
) {
  const eligible = contacts.filter((c) => !meta[c.id].golden && !meta[c.id].duplicateOf);
  // Prefer people whose names have a natural variant.
  const withVariant = eligible.filter((c) => NAME_VARIANTS[c.first_name] || NAME_VARIANTS[c.last_name] || /^(van|de|ter|den) /.test(c.last_name) || /[^\x00-\x7F]/.test(c.first_name + c.last_name));
  const originals = rng.sample(withVariant.length >= count ? withVariant : eligible, count);

  originals.forEach((orig, i) => {
    const id = stableId(`contact:duplicate:${i}`);
    let first = orig.first_name;
    let last = orig.last_name;
    if (NAME_VARIANTS[first]) first = NAME_VARIANTS[first];
    else if (NAME_VARIANTS[last]) last = NAME_VARIANTS[last];
    else if (/^(van|de|ter|den) /.test(last)) last = last[0].toUpperCase() + last.slice(1); // "van Rijn" -> "Van Rijn"
    else { first = ascii(first); last = ascii(last); }

    const variantEmail = rng.pick([
      null,
      `${emailLocal(first, last)}@${rng.pick(["mailbox.example", "inbox.example", "postvak.example"])}`,
      orig.email ? orig.email.replace(/^[^.@]+\./, `${slugify(first).replace(/-/g, "")}.`) : null,
    ]);
    const dup: ContactFixture = {
      ...orig,
      id,
      first_name: first,
      last_name: last,
      email: variantEmail === orig.email ? null : variantEmail,
      linkedin_url: rng.chance(0.4) ? orig.linkedin_url : null,
      headline: rng.chance(0.5) ? orig.headline : orig.current_title,
      summary: null,
      expertise_tags: orig.expertise_tags.slice(0, 2),
    };
    contacts.push(dup);
    meta[id] = { ...meta[orig.id], id, duplicateOf: orig.id, clusterId: null };

    // Copy the two most recent positions.
    const hist = employment.filter((e) => e.contact_id === orig.id).slice(-2);
    hist.forEach((e, k) => employment.push({ ...e, id: stableId(`employment:${id}:${k}`), contact_id: id, description: null }));
  });
}

function ascii(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ø/g, "o").replace(/ł/g, "l").replace(/ı/g, "i");
}
