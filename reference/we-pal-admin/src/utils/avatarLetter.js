// حرف الأفاتار: أول حرف من أول قيمة غير فارغة (الاسم ثم البريد مثلًا)، بحرف كبير للاتينية.
// Array.from بدل charAt كي لا نقسم الرموز المركّبة (emoji) إلى نصفين.
export const AVATAR_FALLBACK = '؟';

export function avatarLetter(...candidates) {
  for (const value of candidates) {
    const text = value == null ? '' : String(value).trim();
    if (text) return Array.from(text)[0].toUpperCase();
  }
  return AVATAR_FALLBACK;
}
