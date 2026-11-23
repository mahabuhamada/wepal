// لغات المادة في قوائم الإدارة: هذه النسخة وأخواتها في مجموعة الترجمة (siblings من قوائم /admin/…)،
// العربية أولًا، ولكلٍّ معرّفها فتفتح شارتُها نسختَها في المحرّر.
const ORDER = ['ar', 'en'];

/** @returns {{ locale: string, id: string, current: boolean }[]} */
export function itemLanguages(item) {
  if (!item) return [];
  const own = { locale: item.locale === 'en' ? 'en' : 'ar', id: item.id, current: true };
  const others = (item.siblings ?? [])
    .filter((s) => s?.id && s.locale && s.locale !== own.locale)
    .map((s) => ({ locale: s.locale, id: s.id, current: false }));
  const seen = new Set();
  return [own, ...others]
    .filter((l) => (seen.has(l.locale) ? false : seen.add(l.locale)))
    .sort((a, b) => ORDER.indexOf(a.locale) - ORDER.indexOf(b.locale));
}
