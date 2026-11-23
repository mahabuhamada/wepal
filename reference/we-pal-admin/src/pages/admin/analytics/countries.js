// اسم الدولة من رمزها بلغة الواجهة (Intl، بلا مكتبة). فلسطين باسمها، و«??» = غير معروف.
const OVERRIDES = { PS: { ar: 'فلسطين', en: 'Palestine' } };

export function countryName(code, lang, unknownLabel = '?') {
  if (!code || code === '??') return unknownLabel;
  if (OVERRIDES[code]) return OVERRIDES[code][lang] ?? OVERRIDES[code].en;
  try {
    return new Intl.DisplayNames([lang === 'ar' ? 'ar' : 'en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

// خمس درجات للخريطة: الحدود العليا لكل درجة من أكبر قيمة (جذر تربيعي حتى لا تبتلع دولة واحدة اللون).
export function steps(max, count = 5) {
  if (!max || max < 1) return [];
  const out = [];
  for (let i = 1; i <= count; i += 1) out.push(Math.max(1, Math.round(max * (i / count) ** 2)));
  return [...new Set(out)];
}

export function stepIndex(value, bounds) {
  if (!value) return -1;
  const i = bounds.findIndex((b) => value <= b);
  return i === -1 ? bounds.length - 1 : i;
}
