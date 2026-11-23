// الأسئلة الشائعة (GET /public/faq و /admin/faq): تجميعها بالتصنيف، وفقرات الجواب، وحساب الترتيب الجديد.

// مفاتيح التصنيفات بترتيب الصفحة، كما يرسلها الخادم (App\Enums\FaqCategory). التسميات في faq.categories.<key>.
export const FAQ_CATEGORIES = ['about', 'membership', 'content', 'participation', 'privacy'];

/**
 * [{ category, items }] بترتيب FAQ_CATEGORIES، بلا الأقسام الفارغة. ترتيب العناصر داخل القسم كما وصلت
 * (الخادم يرتّبها). تصنيف لا تعرفه الواجهة (خادم أحدث) يأتي في الآخر بدل أن يختفي.
 */
export function groupFaqByCategory(items) {
  const groups = new Map(FAQ_CATEGORIES.map((category) => [category, []]));
  for (const item of items ?? []) {
    if (!item) continue;
    const category = item.category || 'about';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  return [...groups].filter(([, list]) => list.length > 0).map(([category, list]) => ({ category, items: list }));
}

/** مرساة السؤال في صفحة المساعدة: /help#faq-<id> (روابط نتائج البحث و«اسأل»). */
export function faqAnchorId(id) {
  return `faq-${id}`;
}

/** رابط سؤال واحد في صفحة المساعدة؛ بلا معرّف: الصفحة نفسها. */
export function faqPath(id) {
  return id === null || id === undefined || id === '' ? '/help' : `/help#${faqAnchorId(id)}`;
}

/** معرّف السؤال (نصًا) من hash الرابط: '#faq-12' ← '12'. غير ذلك ← null. */
export function faqIdFromHash(hash) {
  let value = String(hash ?? '');
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  const match = /^#?faq-([\w-]+)$/.exec(value);
  return match ? match[1] : null;
}

/** فقرات الجواب: الجواب نص عادي، وكل سطر غير فارغ فقرة. */
export function faqParagraphs(answer) {
  return String(answer ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * الترتيب الجديد بعد تحريك سؤال خطوة داخل تصنيفه: معرّفات أسئلة التصنيف (عدا أسئلة العرض، فهي للقراءة فقط)
 * بالترتيب المطلوب، لـ PUT /admin/faq/order. direction: -1 للأعلى، 1 للأسفل.
 * null إن لم يمكن التحريك (أول التصنيف أو آخره، سؤال عرض، أو غير موجود).
 */
export function moveFaq(items, id, direction) {
  const target = (items ?? []).find((item) => item?.id === id);
  if (!target || target.isDemo || (direction !== -1 && direction !== 1)) return null;
  const ids = items.filter((item) => item.category === target.category && !item.isDemo).map((item) => item.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}
