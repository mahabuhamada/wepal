// اسم المنصة — المصدر الوحيد. كل ما يُعرض من اسم (الترويسة، الشريط الجانبي، التذييل، حقوق النشر،
// عنوان الصفحة في المتصفح ومعاينة الروابط، ونصوص تذكر الاسم) يُقرأ من هنا عبر ar.js / en.js و seo.js.
//
// الاسم المعتمد (أمجد، 2026-10-06): «وي بال» / WePal.
// المنتدى الاجتماعي التنموي (SDF) هو الجهة المنفِّذة، ويُذكر بهذه الصفة في التذييل لا كاسم للمنصة.
//   name:    الاسم الظاهر بجانب الشعار وفي الجمل («انضم إلى …»).
//   tagline: السطر الصغير تحت الاسم (أمجد، 2026-10-07). فارغ = لا يُعرض شيء ولا يُضاف إلى عنوان الموقع.
export const BRAND = {
  name: { ar: 'وي بال', en: 'WePal' },
  tagline: { ar: 'منصة سياسية حوارية', en: 'A political dialogue platform' },
};

export const brandTagline = (lang) => BRAND.tagline[lang] ?? BRAND.tagline.ar;

// عنوان الموقع في وسوم الرأس وحقوق النشر: الاسم، ومعه السطر الصغير إن وُجد.
export const brandFullName = (lang) => {
  const name = BRAND.name[lang] ?? BRAND.name.ar;
  const tagline = brandTagline(lang);
  return tagline ? `${name} — ${tagline}` : name;
};
