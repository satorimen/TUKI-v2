import { CITIES, type City } from './cities';

/**
 * Fuzzy city matching over the static cities table.
 *
 * Used by:
 * - MockProvider (detects cities in user messages)
 * - resolveCityInDraft (maps AI's free-text city → canonical cityId)
 *
 * Handles:
 * - Hebrew locative prefixes (בתל אביב contains תל אביב)
 * - Hyphenated names (תל אביב-יפו ↔ תל אביב)
 * - Russian case inflections (в Хайфе ↔ Хайфа) via prefix stems
 * - Latin spelling variants
 */

/** Build lowercase aliases for a city */
function buildAliases(city: City): string[] {
  const aliases: string[] = [];
  const push = (s: string) => {
    const v = s.toLowerCase().trim();
    if (v.length >= 3) aliases.push(v);
  };

  push(city.name.he);
  push(city.name.he.split('-')[0]); // תל אביב-יפו → תל אביב
  push(city.name.ru);
  push(city.name.en.toLowerCase());
  push(city.id.replace(/-/g, ' '));
  // first word of the English name (e.g. "beer" for Beer Sheva)
  push(city.name.en.toLowerCase().split(/[\s'-]/)[0]);

  // Russian stem: names of 5+ chars inflect (Хайфа→Хайфе, Иерусалим→Иерусалиме)
  const ru = city.name.ru.toLowerCase();
  if (ru.length >= 5) push(ru.slice(0, Math.max(4, ru.length - 2)));

  // Hebrew stem: names of 6+ chars may get prefixes/suffixes
  const he = city.name.he;
  if (he.length >= 6) push(he.slice(0, he.length - 2));

  return aliases;
}

const ALIAS_INDEX: { alias: string; cityId: string }[] = CITIES.flatMap((city) =>
  buildAliases(city).map((alias) => ({ alias, cityId: city.id }))
).sort((a, b) => b.alias.length - a.alias.length); // longest first → most specific wins

/** Find the canonical cityId mentioned anywhere in free text (or null) */
export function matchCityId(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const { alias, cityId } of ALIAS_INDEX) {
    if (lower.includes(alias)) return cityId;
  }
  return null;
}
