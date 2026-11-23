// لون مجموعة جديدة حتى يختار المدير غيره (الأزرق الأساسي في نظام التصميم)
export const DEFAULT_GROUP_COLOR = '#2563EB';

// نموذج تعديل المجموعة (B4.3) — منطق بلا واجهة، يُختبر في groupForm.test.js.

// الحقول المتغيّرة فقط — حتى لا يمحو الحفظ ما لم يلمسه المدير.
export function groupPatch(initial, form) {
  const payload = {};
  const ar = form.nameAr.trim();
  const en = form.nameEn.trim();
  if (ar !== initial.nameAr || en !== initial.nameEn) payload.name = en ? { ar, en } : { ar };
  if (form.slug.trim() !== initial.slug) payload.slug = form.slug.trim();
  if (form.color.toUpperCase() !== initial.color.toUpperCase()) payload.color = form.color;
  // الحزمة 4: النوع ورابطه يُرسلان معًا إن تغيّر أيٌّ منها (منطقة ← region، مسار ← track)
  const kind = form.kind ?? '';
  if (kind !== (initial.kind ?? '') || (form.region ?? '') !== (initial.region ?? '') || (form.track ?? '') !== (initial.track ?? '')) {
    payload.kind = kind;
    if (kind === 'REGION') payload.region = form.region;
    if (kind === 'TRACK') payload.track = form.track;
  }
  // الميسّر (ملاحظة هلا د-7): يحذف منشورات هذه المجموعة وتعليقاتها فقط. الفارغ = بلا ميسّر (null).
  if ((form.facilitatorId ?? '') !== (initial.facilitatorId ?? '')) payload.facilitatorId = form.facilitatorId || null;
  // ملاحظة هلا د-6: الوصف والقواعد الخاصة، بلغتين كالاسم. فارغان معًا = محو (null).
  for (const field of GROUP_TEXT_FIELDS) {
    const text = groupText(form, field);
    if (JSON.stringify(text) !== JSON.stringify(groupText(initial, field))) payload[field] = text;
  }
  return payload;
}

// ===== الوصف والقواعد الخاصة (ملاحظة هلا د-6) =====
export const GROUP_TEXT_FIELDS = ['description', 'rules'];
// حدود الخادم (ValidatesGroupText)
export const GROUP_TEXT_MAX = { description: 500, rules: 3000 };

/** نص الحقل بلغتيه كما يُرسل: {ar, en?}، أو null إن كانا فارغين. الحقول: descriptionAr/descriptionEn… */
export function groupText(form, field) {
  const ar = (form?.[`${field}Ar`] ?? '').trim();
  const en = (form?.[`${field}En`] ?? '').trim();
  if (!ar && !en) return null;
  return en ? { ar, en } : { ar };
}

/** قيم الحقلين في النموذج من الترجمات الخام (withTranslations)، أو من النص المحلول (عربي) إن غابت. */
export function groupTextFields(group) {
  const fields = {};
  for (const field of GROUP_TEXT_FIELDS) {
    const raw = group?.translations?.[field];
    fields[`${field}Ar`] = raw ? raw.ar ?? '' : group?.[field] ?? '';
    fields[`${field}En`] = raw?.en ?? '';
  }
  return fields;
}

/** صالح: الإنجليزية لا تأتي بلا عربية، ولا يتجاوز أيٌّ منهما حدّه. */
export function groupTextValid(form, field) {
  const text = groupText(form, field);
  if (!text) return true;
  const max = GROUP_TEXT_MAX[field];
  return Boolean(text.ar) && text.ar.length <= max && (text.en ?? '').length <= max;
}

/**
 * النوع ورابطه صالحان: المنطقة لمجموعة المنطقة، والمسار لمجموعة المسار. لا مجموعات اهتمام جديدة (قرار أمجد
 * 17 نوفمبر)، لكن مجموعة اهتمام قديمة تبقى قابلة للتعديل بنوعها ما لم يغيّره المدير.
 */
export function groupKindValid(form) {
  const kind = form?.kind ?? '';
  if (kind === 'REGION') return Boolean(form.region);
  if (kind === 'TRACK') return Boolean(form.track);
  return kind === 'INTEREST';
}
