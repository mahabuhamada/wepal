// صور المحتوى في الإدارة (جولة التصميم 6، العقد §5 «صور المحتوى»): غلاف الخبر والمقال والمورد،
// صورة صاحب القصة، وصور رؤوس صفحات القوائم. الخادم هو الحكم النهائي (يفحص المحتوى والأبعاد
// ويعيد الترميز WebP)؛ الفحص هنا يوفّر رفعًا فاشلًا لصورة كبيرة أو بنوع مرفوض.

// حين لا يرسل الخادم imageUpload (لا يحدث مع خادم يدعم الصور) لا تُعرض حقول الصور أصلًا.
// لا «القصص»: رأسها ملصق القصة المميّزة (قرار أمجد). blog يبقى المفتاح مع تسمية «تحليلات».
export const PAGE_HEADER_PAGES = ['news', 'blog', 'polls', 'library', 'outputs'];

const MB = 1024 * 1024;

/** سياسة الرفع من رد الإدارة، أو null إن لم يدعم الخادم الصور (فتُخفى الحقول). */
export function imagePolicyFrom(res) {
  const policy = res?.imageUpload;
  if (!policy || !Array.isArray(policy.allowedExtensions) || !(policy.maxBytes > 0)) return null;
  return { allowedExtensions: policy.allowedExtensions.map((ext) => String(ext).toLowerCase()), maxBytes: policy.maxBytes };
}

/** قيمة accept لحقل <input type="file">. */
export function imageAccept(policy) {
  return (policy?.allowedExtensions ?? []).map((ext) => `.${ext}`).join(',');
}

/** «JPG، PNG، WEBP» لنص الإرشاد (jpeg يُختصر مع jpg). */
export function imageTypesLabel(policy, separator = '، ') {
  const types = (policy?.allowedExtensions ?? []).filter((ext) => ext !== 'jpeg').map((ext) => ext.toUpperCase());
  return types.join(separator);
}

/** الحد بالميغابايت مقرّبًا (5242880 ← 5). */
export function imageMaxMb(policy) {
  return Math.round(((policy?.maxBytes ?? 0) / MB) * 10) / 10;
}

/** null إن كانت الصورة مقبولة، وإلا { key, params } لرسالة مترجمة. */
export function validateImage(file, policy) {
  if (!file || !policy) return null;
  const name = file.name || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (!ext || !policy.allowedExtensions.includes(ext)) {
    return { key: 'azraqAdmin.image.typeNotAllowed', params: { types: imageTypesLabel(policy) } };
  }
  if (file.size > policy.maxBytes) {
    return { key: 'azraqAdmin.image.tooLarge', params: { max: imageMaxMb(policy) } };
  }
  return null;
}

/** نص الصورة للتحرير من رد الإدارة: { alt: {ar, en}, credit }. */
export function imageText(image) {
  return {
    alt: { ar: image?.altTranslations?.ar ?? '', en: image?.altTranslations?.en ?? '' },
    credit: image?.credit ?? '',
  };
}

/** هل تغيّر الوصف أو المصدر عن الصورة المحفوظة؟ (المسافات الطرفية لا تُعدّ تغييرًا) */
export function imageTextChanged(image, alt, credit) {
  const saved = imageText(image);
  const same = (a, b) => (a ?? '').trim() === (b ?? '').trim();
  return !same(saved.alt.ar, alt?.ar) || !same(saved.alt.en, alt?.en) || !same(saved.credit, credit);
}

/**
 * حقول multipart للرفع: alt[ar] و alt[en] و credit، و photoConsent "1"/"0" لصورة القصة
 * (الخادم يقبل "1"/"0" لا "true"). الفارغ لا يُرسل (uploadForm يسقطه).
 */
export function imageFormFields({ alt, credit, photoConsent } = {}) {
  const fields = {
    'alt[ar]': (alt?.ar ?? '').trim(),
    'alt[en]': (alt?.en ?? '').trim(),
    credit: (credit ?? '').trim(),
  };
  if (typeof photoConsent === 'boolean') fields.photoConsent = photoConsent ? '1' : '0';
  return fields;
}

/** نص الصورة لطلب PATCH: { ar, en|null } و credit|null (فارغ = حذف). */
export function imageTextPayload(alt, credit) {
  const en = (alt?.en ?? '').trim();
  const trimmedCredit = (credit ?? '').trim();
  return { alt: { ar: (alt?.ar ?? '').trim(), en: en || null }, credit: trimmedCredit || null };
}
