// الأرقام المقبولة حاليًا: جوال فلسطيني +970 فقط (قرار أمجد، SR-16، العقد §4).
// محليًا 059… / 056…، أو دوليًا 9705[69]… مع + أو بدونها. الفراغات والشرطات تُتجاهل.
// الفحص هنا للتنبيه المبكر فقط؛ القائمة الفعلية إعداد على الخادم، ورسالته هي المرجع.
const PALESTINIAN_MOBILE = /^(0|\+?970)5[69]\d{7}$/;

export const normalizePhoneInput = (value) => String(value ?? '').replace(/[\s\-()]/g, '');

export function isPalestinianMobile(value) {
  return PALESTINIAN_MOBILE.test(normalizePhoneInput(value));
}
