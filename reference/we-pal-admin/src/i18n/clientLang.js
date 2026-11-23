// لغة الواجهة الحالية في المتصفح (بعد الترطيب والتبديل). يضبطها LanguageProvider، ويقرؤها عنوان التبويب
// (seo.langFromMatches)، ويعيد LangMeta في root رسم <Meta/> عند تغيّرها.
// لماذا؟ لغة الجذر في بيانات الراوتر ثابتة من لحظة التحميل (والبناء الثابت يُبنى بالعربية)، فكان عنوان
// التبويب يبقى عربيًا بعد التبديل إلى الإنجليزية (ملاحظة هلا ط-2).
// على الخادم تبقى null دائمًا (لا تُضبط إلا من تأثير في المتصفح)، فلا تتشارك الطلبات قيمة.
let current = null;
const listeners = new Set();

export const getClientLang = () => current;

export function setClientLang(lang) {
  const next = lang === 'ar' || lang === 'en' ? lang : null;
  if (next === current) return;
  current = next;
  listeners.forEach((fn) => fn());
}

export function subscribeClientLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
