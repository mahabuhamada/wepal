// فترة التقارير: 7 أو 30 أو 90 يومًا تنتهي اليوم (بتوقيت فلسطين)، أو مدى مخصّص.
export const PRESETS = [7, 30, 90];
export const TZ = 'Asia/Hebron';

// تاريخ اليوم YYYY-MM-DD بتوقيت فلسطين (اليوم نفسه الذي يجمّع به الخادم المشاهدات)
export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function presetPeriod(days, now = new Date()) {
  const to = todayIso(now);
  return { from: addDays(to, -(days - 1)), to, days };
}

export function periodLength({ from, to }) {
  return Math.round((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000) + 1;
}

export function formatDay(iso, lang, opts = { day: 'numeric', month: 'short' }) {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { timeZone: 'UTC', ...opts });
}

export const formatNumber = (n, lang) => (typeof n === 'number' ? n.toLocaleString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB') : n);

// التغيّر عن الفترة السابقة بالنسبة المئوية؛ null إن لم تكن للفترة السابقة قيمة (لا قسمة على صفر ولا «+∞»).
export function deltaPct(value, previous) {
  if (typeof value !== 'number' || typeof previous !== 'number' || previous === 0) return null;
  return Math.round(((value - previous) / previous) * 100);
}

// «7 أيام» و«30 يومًا»: تمييز العدد في العربية (3–10 جمع، 11 فما فوق مفرد منصوب).
export function daysLabel(n, lang) {
  if (lang !== 'ar') return `${n} ${n === 1 ? 'day' : 'days'}`;
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومان';
  if (n >= 3 && n <= 10) return `${n} أيام`;
  return `${n} يومًا`;
}
