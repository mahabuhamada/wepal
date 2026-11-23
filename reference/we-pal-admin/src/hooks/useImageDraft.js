import { useCallback, useState } from 'react';
import { imageText, imageTextChanged, imageTextPayload } from '../utils/images';

// مسودة صورة المحتوى داخل نموذج الإدارة: الصورة المحفوظة (current) وصورة جديدة مختارة (file)
// وطلب الحذف (remove) والنص (alt {ar, en} و credit). لا شيء يُرسل قبل «حفظ» النموذج.
const fresh = (current) => ({ current: current ?? null, file: null, remove: false, ...imageText(current), error: null });

export default function useImageDraft() {
  const [draft, setDraft] = useState(() => fresh(null));
  const reset = useCallback((current) => setDraft(fresh(current)), []);
  const update = useCallback((changes) => setDraft((d) => ({ ...d, ...changes })), []);
  return { draft, reset, update };
}

/** هل ستكون للعنصر صورة بعد الحفظ؟ */
export function draftHasImage(d) {
  return Boolean(d.file) || (Boolean(d.current) && !d.remove);
}

/** صورة بلا وصف عربي لا تُرسل (الخادم يرفضها بـ 422). */
export function draftAltMissing(d) {
  return draftHasImage(d) && !(d.alt?.ar ?? '').trim();
}

/**
 * يطبّق المسودة بعد حفظ العنصر (يحتاج id): رفع صورة جديدة، أو حذف، أو تعديل النص فقط.
 * يرجع العنصر المحدّث من الخادم، أو null إن لم يتغيّر شيء.
 * extra: حقول إضافية للرفع (photoConsent لصورة القصة).
 */
export async function commitImageDraft(d, { id, upload, remove, patchText, extra = {} }) {
  if (d.file) return upload(id, { file: d.file, alt: d.alt, credit: d.credit, ...extra });
  if (d.remove && d.current) return remove(id);
  if (d.current && imageTextChanged(d.current, d.alt, d.credit)) return patchText(id, imageTextPayload(d.alt, d.credit));
  return null;
}
