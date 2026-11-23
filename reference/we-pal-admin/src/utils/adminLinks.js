// روابط لوحة الإدارة بين العناصر (المرحلة 2): اسم العضو ← ملفه، والمساحة ← صفحتها، والمجموعة ← حائطها.

/** اسم ثنائي اللغة {ar,en} أو نص عادي → نص بلغة الواجهة (العربية احتياطًا). */
export const localName = (name, lang) => (name && typeof name === 'object' ? name[lang] || name.ar || name.en || '' : name || '');

/** مكان المحتوى: { kind: 'group'|'workspace', id } → صفحته. */
export const placeHref = (place) => {
  if (!place?.id) return null;
  return place.kind === 'group' ? `/community/${encodeURIComponent(place.id)}` : `/projects/${encodeURIComponent(place.id)}`;
};

/** صفحة العضو في الإدارة (360، المرحلة 4). */
export const memberHref = (id) => (id ? `/admin/users/${encodeURIComponent(id)}` : null);

/**
 * هل الرابط يعرض ما في الصفحة الآن بالضبط؟ (المسار نفسه والمرشّحات نفسها بأي ترتيب)
 * بطاقة «نظرة عامة» كهذه لا تكون رابطًا: النقر عليها لا يغيّر شيئًا (docs/ADMIN-UX.md §2).
 */
export function isSameView(to, location) {
  if (!to || !location) return false;
  const url = new URL(to, 'http://x');
  const norm = (search) => [...new URLSearchParams(search)].map(([k, v]) => `${k}=${v}`).sort().join('&');
  return url.pathname === location.pathname && norm(url.search) === norm(location.search ?? '');
}
